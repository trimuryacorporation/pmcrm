import express from 'express';
import { body } from 'express-validator';
import { createAdministrator, listAccessUsers, listAdministrators, updateAdministratorStatus, updateUserAccessRole, updateUserPermissions } from '../controllers/adminController.js';
import { authorize, protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(protect, authorize('super_admin'));
router.get('/access-users', listAccessUsers);
router.patch('/access-users/:id/role', body('role').isIn(['super_admin', 'admin', 'employee', 'vendor', 'freelancer', 'candidate']).withMessage('Valid role is required'), validate, updateUserAccessRole);
router.patch('/access-users/:id/permissions', updateUserPermissions);
router.route('/')
  .get(listAdministrators)
  .post([
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').isIn(['super_admin', 'admin']).withMessage('Role must be Admin or Super Admin')
  ], validate, createAdministrator);
router.patch('/:id/status', body('isActive').isBoolean().withMessage('Status is required'), validate, updateAdministratorStatus);

export default router;
