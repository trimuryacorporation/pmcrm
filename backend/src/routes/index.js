import express from 'express';
import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';
import { dashboard } from '../controllers/dashboardController.js';
import { getReport } from '../controllers/reportController.js';
import { downloadProjectFile, uploadFiles } from '../controllers/uploadController.js';
import { heartbeat, listActivity, listDeliveries, listUsers, updateLocation } from '../controllers/activityController.js';
import { getStorageSettings, testStorageSettings, updateStorageSettings } from '../controllers/settingsController.js';
import { getCommunicationSettings, testEmail, testWhatsApp, updateCommunicationSettings } from '../controllers/communicationSettingsController.js';
import { protect } from '../middleware/auth.js';
import { globalSearch } from '../controllers/searchController.js';
import { authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  allocationRoutes,
  candidateRoutes,
  employeeRoutes,
  freelancerRoutes,
  invoiceRoutes,
  notificationRoutes,
  paymentRoutes,
  projectRoutes,
  taskRoutes,
  vendorRoutes
} from './resourceRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.get('/search', protect, globalSearch);
router.use('/administrators', adminRoutes);
router.get('/dashboard', protect, authorize('super_admin', 'admin', 'employee'), dashboard);
router.use('/projects', projectRoutes);
router.use('/candidates', candidateRoutes);
router.use('/vendors', vendorRoutes);
router.use('/freelancers', freelancerRoutes);
router.use('/employees', employeeRoutes);
router.use('/allocations', allocationRoutes);
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
router.get('/settings/storage', protect, authorize('super_admin'), getStorageSettings);
router.post('/settings/storage/test', protect, authorize('super_admin'), testStorageSettings);
router.put('/settings/storage', protect, authorize('super_admin'), updateStorageSettings);
router.get('/settings/communications', protect, authorize('super_admin'), getCommunicationSettings);
router.put('/settings/communications', protect, authorize('super_admin'), updateCommunicationSettings);
router.post('/settings/communications/test-email', protect, authorize('super_admin'), testEmail);
router.post('/settings/communications/test-whatsapp', protect, authorize('super_admin'), testWhatsApp);

export default router;
