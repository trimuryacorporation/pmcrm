import express from 'express';
import { body } from 'express-validator';
import Project from '../models/Project.js';
import TaskFolder from '../models/TaskFolder.js';
import Client from '../models/Client.js';
import { Candidate, Employee, Freelancer, Vendor } from '../models/People.js';
import { Allocation, Task } from '../models/Work.js';
import { Invoice, Payment } from '../models/Finance.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { authorize, protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createCrudController } from '../controllers/crudController.js';
import { createAllocation } from '../controllers/allocationController.js';
import { notifyProjectCreated } from '../services/projectNotificationService.js';
import { inviteCandidate, inviteEmployee, inviteFreelancer, inviteVendor } from '../services/employeeInviteService.js';
import { ensureUniquePersonContact } from '../services/personContactService.js';
import { applicationRules, getMyProjectApplication, listProjectApplications, submitProjectApplication } from '../controllers/projectApplicationController.js';

const adminRoles = ['super_admin', 'admin'];
const employeeManagers = [...adminRoles, 'employee'];
const hiddenContact = '******';

function hideAdminOnlyFields(fields) {
  return (item, req) => {
    if (adminRoles.includes(req.user.role)) return item;
    const data = typeof item.toObject === 'function' ? item.toObject() : { ...item };
    fields.forEach((field) => { delete data[field]; });
    return data;
  };
}

function employeeOwnedScope(user) {
  return user.linkedEmployee ? { ownerEmployee: user.linkedEmployee } : { _id: null };
}

function maskOtherEmployeeContacts(fields) {
  return (item, req) => {
    if (req.user.role !== 'employee') return item;

    const data = typeof item.toObject === 'function' ? item.toObject() : { ...item };
    const ownerId = data.ownerEmployee?._id || data.ownerEmployee;
    const isOwner = Boolean(req.user.linkedEmployee) && String(ownerId || '') === String(req.user.linkedEmployee);
    data._canManage = isOwner;

    if (!isOwner) fields.forEach((field) => { data[field] = hiddenContact; });
    return data;
  };
}

function vendorScope(user, fallback = {}) {
  if (user.role !== 'vendor') return fallback;
  return user.linkedVendor ? { vendor: user.linkedVendor } : { _id: null };
}

function vendorOwnedData(req, body) {
  if (req.user.role !== 'vendor') return body;
  if (!req.user.linkedVendor) {
    const error = new Error('Vendor account is not linked to a vendor profile');
    error.statusCode = 403;
    throw error;
  }
  const { ownerEmployee, ...data } = body;
  return { ...data, vendor: req.user.linkedVendor };
}

function employeeOwnedData(req, body) {
  if (req.user.role !== 'employee') return body;
  if (!req.user.linkedEmployee) {
    const error = new Error('Employee account is not linked to an employee profile');
    error.statusCode = 403;
    throw error;
  }
  const { vendor, ...data } = body;
  return { ...data, ownerEmployee: req.user.linkedEmployee };
}

function peopleOwnedData(req, body) {
  return employeeOwnedData(req, vendorOwnedData(req, body));
}

async function peopleDataWithUniqueContact(req, body, type, ownership) {
  const data = ownership(req, body);
  if (data.email) data.email = data.email.trim().toLowerCase();
  await ensureUniquePersonContact({ type, data, id: req.params.id });
  return data;
}

function projectData(body) {
  const data = { ...body };
  if (typeof data.applicationQuestions === 'string') {
    data.applicationQuestions = data.applicationQuestions.split('\n').map((question) => question.trim()).filter(Boolean);
  }
  return data;
}

async function taskFolderData(req, body) {
  const project = await Project.findById(body.project).select('name');
  if (!project) {
    const error = new Error('Selected project was not found');
    error.statusCode = 404;
    throw error;
  }
  return { project: project._id, name: project.name };
}

function passwordSetupStatus(account) {
  if (!account) return 'Not set';
  if (account.passwordSetAt) return 'Password set';
  if (account.passwordSetupToken && account.passwordSetupExpires > new Date()) return 'Setup pending';
  return 'Not set';
}

function enrichPeopleWithPasswordStatus(linkField) {
  return async (items) => {
    if (!items.length) return items;
    const profileIds = items.map((item) => item._id);
    const emails = items.map((item) => item.email?.trim().toLowerCase()).filter(Boolean);
    const users = await User.find({ $or: [{ [linkField]: { $in: profileIds } }, ...(emails.length ? [{ email: { $in: emails } }] : [])] })
      .select(`email ${linkField} passwordSetAt +passwordSetupToken +passwordSetupExpires`)
      .lean();
    const usersByProfile = new Map(users.filter((user) => user[linkField]).map((user) => [String(user[linkField]), user]));
    const usersByEmail = new Map(users.map((user) => [user.email, user]));
    return items.map((item) => {
      const data = typeof item.toObject === 'function' ? item.toObject() : item;
      return {
        ...data,
        passwordSetupStatus: passwordSetupStatus(usersByProfile.get(String(data._id)) || usersByEmail.get(data.email?.trim().toLowerCase()))
      };
    });
  };
}

function routerFor(controller, rules = [], access = {}) {
  const router = express.Router();
  const readRoles = access.readRoles || ['super_admin', 'admin', 'employee', 'vendor', 'freelancer'];
  const writeRoles = access.writeRoles || adminRoles;
  router.use(protect);
  router.route('/').get(authorize(...readRoles), controller.list).post(authorize(...writeRoles), rules, validate, controller.create);
  router.route('/:id').get(authorize(...readRoles), controller.get).put(authorize(...writeRoles), controller.update).delete(authorize(...writeRoles), controller.remove);
  return router;
}

export const projectRoutes = routerFor(
  createCrudController(Project, {
    populate: 'projectManager employees vendors freelancers candidates',
    searchFields: ['name', 'code', 'clientName'],
    searchFieldsForUser: (user) => adminRoles.includes(user.role) ? ['name', 'code', 'clientName'] : ['name', 'code'],
    transformRead: hideAdminOnlyFields(['clientName', 'clientRate']),
    afterCreate: notifyProjectCreated,
    prepareCreate: (req, body) => projectData(body),
    prepareUpdate: (req, body) => projectData(body),
    // Projects created by the CRM team are visible to every permitted project user.
    // Sensitive client fields are removed by transformRead for non-admin users.
    userScope: () => ({})
  }),
  [body('name').notEmpty(), body('code').notEmpty(), body('clientName').notEmpty()]
);
projectRoutes.post('/:id/applications', authorize('employee', 'vendor', 'freelancer'), applicationRules, validate, submitProjectApplication);
projectRoutes.get('/:id/applications/mine', authorize('employee', 'vendor', 'freelancer'), getMyProjectApplication);
projectRoutes.get('/:id/applications', authorize(...adminRoles), listProjectApplications);

export const clientRoutes = routerFor(createCrudController(Client, {
  searchFields: ['name', 'companyName', 'contactPerson', 'email', 'phone']
}), [body('name').trim().notEmpty().withMessage('Client name is required')], { readRoles: adminRoles, writeRoles: adminRoles });

export const candidateRoutes = routerFor(createCrudController(Candidate, {
  populate: 'assignedProject vendor ownerEmployee',
  searchFields: ['fullName', 'email'],
  languageField: 'language',
  prepareCreate: (req, body) => peopleDataWithUniqueContact(req, body, 'Candidate', peopleOwnedData),
  prepareUpdate: (req, body) => peopleDataWithUniqueContact(req, body, 'Candidate', peopleOwnedData),
  transformRead: maskOtherEmployeeContacts(['email', 'mobile']),
  enrichList: enrichPeopleWithPasswordStatus('linkedCandidate'),
  readScope: (user) => {
    if (user.role === 'candidate') return user.linkedCandidate ? { _id: user.linkedCandidate } : { _id: null };
    if (user.role === 'vendor') return vendorScope(user);
    if (user.role === 'employee') return {};
    return {};
  },
  writeScope: (user) => {
    if (user.role === 'vendor') return vendorScope(user);
    if (user.role === 'employee') return employeeOwnedScope(user);
    return {};
  }
}), [
  body('fullName').notEmpty(),
  body('mobile').notEmpty().withMessage('Mobile number is required')
], { readRoles: ['super_admin', 'admin', 'employee', 'candidate'], writeRoles: employeeManagers });
candidateRoutes.post('/:id/invite', authorize(...employeeManagers), invitePersonRoute(Candidate, inviteCandidate, 'Candidate'));
export const vendorRoutes = routerFor(createCrudController(Vendor, {
  populate: 'assignedProjects ownerEmployee',
  searchFields: ['agencyName'],
  afterCreate: inviteVendor,
  languageField: 'languagesAvailable',
  prepareCreate: (req, body) => peopleDataWithUniqueContact(req, body, 'Vendor', employeeOwnedData),
  prepareUpdate: (req, body) => peopleDataWithUniqueContact(req, body, 'Vendor', employeeOwnedData),
  transformRead: maskOtherEmployeeContacts(['email', 'phone']),
  enrichList: enrichPeopleWithPasswordStatus('linkedVendor'),
  readScope: (user) => {
    if (user.role === 'vendor') return user.linkedVendor ? { _id: user.linkedVendor } : { _id: null };
    if (user.role === 'employee') return {};
    return {};
  },
  writeScope: (user) => {
    if (user.role === 'vendor') return user.linkedVendor ? { _id: user.linkedVendor } : { _id: null };
    if (user.role === 'employee') return employeeOwnedScope(user);
    return {};
  }
}), [
  body('agencyName').notEmpty()
], { readRoles: ['super_admin', 'admin', 'employee'], writeRoles: employeeManagers });
export const freelancerRoutes = routerFor(createCrudController(Freelancer, {
  populate: 'assignedProjects vendor ownerEmployee',
  searchFields: ['name'],
  afterCreate: inviteFreelancer,
  languageField: 'language',
  prepareCreate: (req, body) => peopleDataWithUniqueContact(req, body, 'Freelancer', peopleOwnedData),
  prepareUpdate: (req, body) => peopleDataWithUniqueContact(req, body, 'Freelancer', peopleOwnedData),
  transformRead: maskOtherEmployeeContacts(['email', 'phone']),
  enrichList: enrichPeopleWithPasswordStatus('linkedFreelancer'),
  readScope: (user) => {
    if (user.role === 'vendor') return vendorScope(user);
    if (user.role === 'employee') return {};
    if (user.role === 'freelancer') return user.linkedFreelancer ? { _id: user.linkedFreelancer } : { _id: null };
    return {};
  },
  writeScope: (user) => {
    if (user.role === 'vendor') return vendorScope(user);
    if (user.role === 'employee') return employeeOwnedScope(user);
    if (user.role === 'freelancer') return user.linkedFreelancer ? { _id: user.linkedFreelancer } : { _id: null };
    return {};
  }
}), [
  body('name').notEmpty()
], { readRoles: ['super_admin', 'admin', 'employee'], writeRoles: employeeManagers });
export const employeeRoutes = routerFor(createCrudController(Employee, {
  populate: 'assignedProjects vendor',
  searchFields: ['name', 'employeeId'],
  afterCreate: inviteEmployee,
  prepareCreate: vendorOwnedData,
  prepareUpdate: vendorOwnedData,
  userScope: (user) => {
    if (user.role === 'vendor') return vendorScope(user);
    if (user.role === 'employee') return user.linkedEmployee ? { _id: user.linkedEmployee } : { _id: null };
    return {};
  }
}), [
  body('employeeId').notEmpty(),
  body('name').notEmpty(),
  body('email').isEmail().withMessage('A valid email is required to invite the employee')
], { readRoles: ['super_admin', 'admin', 'employee'], writeRoles: employeeManagers });
employeeRoutes.post('/:id/invite', authorize(...employeeManagers), async (req, res, next) => {
  try {
    const filter = { _id: req.params.id };
    const employee = await Employee.findOne(filter);
    if (!employee) {
      res.status(404);
      throw new Error('Employee not found');
    }
    await inviteEmployee(employee);
    res.json({ message: `Invite email sent to ${employee.email}` });
  } catch (error) {
    next(error);
  }
});

function invitePersonRoute(Model, invite, resourceName) {
  return async (req, res, next) => {
    try {
      const person = await Model.findById(req.params.id);
      if (!person) {
        res.status(404);
        throw new Error(`${resourceName} not found`);
      }
      await invite(person);
      res.json({ message: `Password setup email sent to ${person.email}` });
    } catch (error) {
      next(error);
    }
  };
}

vendorRoutes.post('/:id/invite', authorize(...employeeManagers), invitePersonRoute(Vendor, inviteVendor, 'Vendor'));
freelancerRoutes.post('/:id/invite', authorize(...employeeManagers), invitePersonRoute(Freelancer, inviteFreelancer, 'Freelancer'));

const allocationController = createCrudController(Allocation, {
  populate: 'project employee vendor freelancer candidate',
  userScope: (user) => {
    if (user.role === 'employee') return { employee: user.linkedEmployee };
    if (user.role === 'vendor') return { vendor: user.linkedVendor };
    if (user.role === 'freelancer') return { freelancer: user.linkedFreelancer };
    return {};
  }
});
export const allocationRoutes = express.Router();
allocationRoutes.use(protect);
allocationRoutes.route('/').get(authorize(...employeeManagers), allocationController.list).post(authorize(...adminRoles), createAllocation);
allocationRoutes.route('/:id').get(authorize(...employeeManagers), allocationController.get).put(authorize(...adminRoles), allocationController.update).delete(authorize(...adminRoles), allocationController.remove);

const taskController = createCrudController(Task, {
  populate: 'folder project employee vendor freelancer candidate'
});
const taskFolderController = createCrudController(TaskFolder, {
  populate: 'project',
  searchFields: ['name'],
  prepareCreate: taskFolderData,
  prepareUpdate: taskFolderData
});
export const taskFolderRoutes = express.Router();
taskFolderRoutes.use(protect);
taskFolderRoutes.route('/')
  .get(authorize(...employeeManagers), taskFolderController.list)
  .post(authorize(...employeeManagers), [body('project').notEmpty().withMessage('Project is required')], validate, taskFolderController.create);
taskFolderRoutes.route('/:id')
  .get(authorize(...employeeManagers), taskFolderController.get)
  .put(authorize(...adminRoles), taskFolderController.update)
  .delete(authorize(...adminRoles), taskFolderController.remove);
export const taskRoutes = express.Router();
taskRoutes.use(protect);
taskRoutes.route('/').get(authorize(...employeeManagers), taskController.list).post(authorize(...employeeManagers), [body('title').notEmpty(), body('folder').notEmpty()], validate, taskController.create);
taskRoutes.route('/:id')
  .get(authorize(...employeeManagers), taskController.get)
  .put(authorize(...employeeManagers), taskController.update)
  .delete(authorize(...employeeManagers), taskController.remove);
export const paymentRoutes = routerFor(createCrudController(Payment, { populate: 'project' }), [body('payeeName').notEmpty(), body('amount').isNumeric()], { readRoles: adminRoles });
export const invoiceRoutes = routerFor(createCrudController(Invoice, { populate: 'project' }), [
  body('invoiceNumber').notEmpty(),
  body('payeeName').notEmpty(),
  body('amount').isNumeric()
], { readRoles: adminRoles });
export const notificationRoutes = routerFor(createCrudController(Notification, {
  populate: 'user',
  userScope: (user) => ({ user: user._id })
}), [body('title').notEmpty()]);
