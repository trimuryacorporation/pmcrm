import express from 'express';
import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';
import { dashboard } from '../controllers/dashboardController.js';
import { getReport } from '../controllers/reportController.js';
import { downloadProjectFile, uploadFiles } from '../controllers/uploadController.js';
import { heartbeat, listActivity, listDeliveries, listEmployeeActivity, listUsers, logEmployeeView, updateLocation } from '../controllers/activityController.js';
import { getStorageSettings, testStorageSettings, updateStorageSettings } from '../controllers/settingsController.js';
import { getCommunicationSettings, testEmail, testWhatsApp, updateCommunicationSettings } from '../controllers/communicationSettingsController.js';
import { createPortal, listPortals } from '../controllers/portalController.js';
import { protect } from '../middleware/auth.js';
import { globalSearch } from '../controllers/searchController.js';
import { authorize, authorizeResource } from '../middleware/auth.js';
import { body } from 'express-validator';
import { createApiKey, listApiKeys, revokeApiKey } from '../controllers/apiAccessController.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';
import {
  allocationRoutes,
  candidateRoutes,
  clientRoutes,
  employeeRoutes,
  freelancerRoutes,
  invoiceRoutes,
  notificationRoutes,
  paymentRoutes,
  projectRoutes,
  taskFolderRoutes,
  taskRoutes,
  vendorRoutes
} from './resourceRoutes.js';

const router = express.Router();

function mountPath(layer) {
  if (layer.regexp?.fast_slash) return '';
  const source = layer.regexp?.source || '';
  const start = '^\\/';
  const end = '\\/?(?=\\/|$)$';
  if (!source.startsWith(start) || !source.endsWith(end)) return '';
  return `/${source.slice(start.length, -end.length).replace(/\\\//g, '/')}`;
}

function collectEndpoints(currentRouter, prefix = '') {
  return currentRouter.stack.flatMap((layer) => {
    if (layer.route) {
      return Object.keys(layer.route.methods)
        .filter((method) => method !== '_all')
        .map((method) => ({ method: method.toUpperCase(), path: `${prefix}${layer.route.path}`.replace(/\/\/{2,}/g, '/') }));
    }
    if (layer.handle?.stack) return collectEndpoints(layer.handle, `${prefix}${mountPath(layer)}`);
    return [];
  });
}

router.use('/auth', authRoutes);
router.get('/api-access/endpoints', protect, authorize('super_admin'), (req, res) => {
  const items = collectEndpoints(router, '/api')
    .filter((item) => !item.path.includes('/api-access/endpoints'))
    .sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
  const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  res.json({ baseUrl, authentication: 'Send x-api-key: YOUR_API_KEY with every request.', items });
});
router.route('/api-access/keys')
  .get(protect, authorize('super_admin'), listApiKeys)
  .post(protect, authorize('super_admin'), [body('name').trim().notEmpty().withMessage('Key name is required'), body('role').optional().isIn(['super_admin', 'admin'])], validate, createApiKey);
router.patch('/api-access/keys/:id/revoke', protect, authorize('super_admin'), revokeApiKey);
router.get('/search', protect, globalSearch);
router.use('/administrators', adminRoutes);
router.get('/dashboard', protect, authorize('super_admin', 'admin', 'employee', 'candidate'), dashboard);
router.use('/projects', projectRoutes);
router.use('/clients', clientRoutes);
router.use('/candidates', candidateRoutes);
router.use('/vendors', vendorRoutes);
router.use('/freelancers', freelancerRoutes);
router.use('/employees', employeeRoutes);
router.use('/allocations', allocationRoutes);
router.use('/task-folders', taskFolderRoutes);
router.use('/tasks', taskRoutes);
router.use('/payments', paymentRoutes);
router.use('/invoices', invoiceRoutes);
router.get('/reports', protect, authorize('super_admin', 'admin'), getReport);
router.use('/notifications', notificationRoutes);
router.post('/uploads', protect, authorize('super_admin', 'admin'), upload.array('files', 10), uploadFiles);
router.get('/uploads/projects/:projectId/:fileIndex', protect, downloadProjectFile);
router.post('/activity/heartbeat', protect, heartbeat);
router.put('/activity/location', protect, updateLocation);
router.get('/activity', protect, listActivity);
router.get('/activity/users', protect, authorize('super_admin', 'admin'), listUsers);
router.get('/activity/deliveries', protect, authorize('super_admin', 'admin'), listDeliveries);
router.get('/employee-activity', protect, authorizeResource('employee-activity-report', 'view', 'super_admin', 'admin'), listEmployeeActivity);
router.post('/employee-activity/log-view', protect, authorize('super_admin', 'admin', 'employee'), logEmployeeView);
router.get('/settings/storage', protect, authorize('super_admin'), getStorageSettings);
router.post('/settings/storage/test', protect, authorize('super_admin'), testStorageSettings);
router.put('/settings/storage', protect, authorize('super_admin'), updateStorageSettings);
router.get('/settings/communications', protect, authorize('super_admin'), getCommunicationSettings);
router.put('/settings/communications', protect, authorize('super_admin'), updateCommunicationSettings);
router.post('/settings/communications/test-email', protect, authorize('super_admin'), testEmail);
router.post('/settings/communications/test-whatsapp', protect, authorize('super_admin'), testWhatsApp);
router.route('/portals').get(protect, authorizeResource('portal-directory', 'view', 'super_admin', 'admin'), listPortals).post(protect, authorize('super_admin'), createPortal);

export default router;
