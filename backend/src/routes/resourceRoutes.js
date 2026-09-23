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

const adminRoles = ['super_admin', 'admin'];

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

export const candidateRoutes = routerFor(createCrudController(Candidate, { populate: 'assignedProject', searchFields: ['fullName', 'email'] }), [
  body('fullName').notEmpty()
], { readRoles: ['super_admin', 'admin', 'employee'] });
export const vendorRoutes = routerFor(createCrudController(Vendor, {
  populate: 'assignedProjects',
  searchFields: ['agencyName'],
  userScope: (user) => (user.role === 'vendor' ? { _id: user.linkedVendor } : {})
}), [
  body('agencyName').notEmpty()
], { readRoles: ['super_admin', 'admin', 'vendor'] });
export const freelancerRoutes = routerFor(createCrudController(Freelancer, {
  populate: 'assignedProjects',
  searchFields: ['name'],
  userScope: (user) => (user.role === 'freelancer' ? { _id: user.linkedFreelancer } : {})
}), [
  body('name').notEmpty()
], { readRoles: ['super_admin', 'admin', 'freelancer'] });
export const employeeRoutes = routerFor(createCrudController(Employee, {
  populate: 'assignedProjects',
  searchFields: ['name', 'employeeId'],
  userScope: (user) => (user.role === 'employee' ? { _id: user.linkedEmployee } : {})
}), [
  body('employeeId').notEmpty(),
  body('name').notEmpty()
], { readRoles: ['super_admin', 'admin', 'employee'] });

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
