import express from 'express';
import { body } from 'express-validator';
import Project from '../models/Project.js';
import { Candidate, Employee, Freelancer, Vendor } from '../models/People.js';
import { Allocation, Task } from '../models/Work.js';
import { Invoice, Payment } from '../models/Finance.js';
import Notification from '../models/Notification.js';
import { authorize, protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createCrudController } from '../controllers/crudController.js';
import { createAllocation } from '../controllers/allocationController.js';
import { notifyProjectCreated } from '../services/projectNotificationService.js';
import { inviteEmployee } from '../services/employeeInviteService.js';

const adminRoles = ['super_admin', 'admin'];
const vendorManagers = [...adminRoles, 'vendor'];
const employeeManagers = [...adminRoles, 'employee'];
const peopleManagers = [...adminRoles, 'vendor', 'employee'];

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
    afterCreate: notifyProjectCreated,
    userScope: (user) => {
      if (user.role === 'employee') return { employees: user.linkedEmployee };
      if (user.role === 'vendor') return { vendors: user.linkedVendor };
      if (user.role === 'freelancer') return { freelancers: user.linkedFreelancer };
      return {};
    }
  }),
  [body('name').notEmpty(), body('code').notEmpty(), body('clientName').notEmpty()]
);

export const candidateRoutes = routerFor(createCrudController(Candidate, {
  populate: 'assignedProject vendor ownerEmployee',
  searchFields: ['fullName', 'email'],
  prepareCreate: peopleOwnedData,
  prepareUpdate: peopleOwnedData,
  userScope: (user) => {
    if (user.role === 'vendor') return vendorScope(user);
    if (user.role === 'employee') return user.linkedEmployee ? { ownerEmployee: user.linkedEmployee } : { _id: null };
    return {};
  }
}), [
  body('fullName').notEmpty(),
  body('mobile').notEmpty().withMessage('Mobile number is required')
], { readRoles: ['super_admin', 'admin', 'employee', 'vendor'], writeRoles: peopleManagers });
export const vendorRoutes = routerFor(createCrudController(Vendor, {
  populate: 'assignedProjects ownerEmployee',
  searchFields: ['agencyName'],
  prepareCreate: employeeOwnedData,
  prepareUpdate: employeeOwnedData,
  userScope: (user) => {
    if (user.role === 'vendor') return user.linkedVendor ? { _id: user.linkedVendor } : { _id: null };
    if (user.role === 'employee') return user.linkedEmployee ? { ownerEmployee: user.linkedEmployee } : { _id: null };
    return {};
  }
}), [
  body('agencyName').notEmpty()
], { readRoles: ['super_admin', 'admin', 'employee', 'vendor'], writeRoles: employeeManagers });
export const freelancerRoutes = routerFor(createCrudController(Freelancer, {
  populate: 'assignedProjects vendor ownerEmployee',
  searchFields: ['name'],
  prepareCreate: peopleOwnedData,
  prepareUpdate: peopleOwnedData,
  userScope: (user) => {
    if (user.role === 'vendor') return vendorScope(user);
    if (user.role === 'employee') return user.linkedEmployee ? { ownerEmployee: user.linkedEmployee } : { _id: null };
    if (user.role === 'freelancer') return user.linkedFreelancer ? { _id: user.linkedFreelancer } : { _id: null };
    return {};
  }
}), [
  body('name').notEmpty()
], { readRoles: ['super_admin', 'admin', 'employee', 'vendor', 'freelancer'], writeRoles: peopleManagers });
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
], { readRoles: ['super_admin', 'admin', 'vendor', 'employee'], writeRoles: vendorManagers });
employeeRoutes.post('/:id/invite', authorize(...vendorManagers), async (req, res, next) => {
  try {
    if (req.user.role === 'vendor' && !req.user.linkedVendor) {
      res.status(403);
      throw new Error('Vendor account is not linked to a vendor profile');
    }
    const filter = { _id: req.params.id };
    if (req.user.role === 'vendor') filter.vendor = req.user.linkedVendor;
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
allocationRoutes.route('/').get(allocationController.list).post(authorize(...adminRoles), createAllocation);
allocationRoutes.route('/:id').get(allocationController.get).put(authorize(...adminRoles), allocationController.update).delete(authorize(...adminRoles), allocationController.remove);

const taskController = createCrudController(Task, {
  populate: 'project employee vendor freelancer candidate',
  userScope: (user) => {
    if (user.role === 'employee') return { employee: user.linkedEmployee };
    if (user.role === 'vendor') return { vendor: user.linkedVendor };
    if (user.role === 'freelancer') return { freelancer: user.linkedFreelancer };
    return {};
  }
});
export const taskRoutes = express.Router();
taskRoutes.use(protect);
taskRoutes.route('/').get(taskController.list).post(authorize(...adminRoles), [body('title').notEmpty(), body('project').notEmpty()], validate, taskController.create);
taskRoutes.route('/:id')
  .get(taskController.get)
  .put((req, res, next) => {
    if (adminRoles.includes(req.user.role)) return next();
    req.body = Object.fromEntries(Object.entries(req.body).filter(([key]) => ['status', 'completionPercentage', 'comments'].includes(key)));
    next();
  }, taskController.update)
  .delete(authorize(...adminRoles), taskController.remove);
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
