import express from 'express';
import { forgotPassword, forgotPasswordRules, login, loginRules, me, register, registerRules, resetPassword, resetPasswordRules, setPassword, setPasswordRules, updateProfile, updateProfileRules, validateInvite } from '../controllers/authController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.post('/login', loginRules, validate, login);
router.post('/forgot-password', forgotPasswordRules, validate, forgotPassword);
router.post('/reset-password', resetPasswordRules, validate, resetPassword);
router.get('/invite/:token', validateInvite);
router.post('/set-password', setPasswordRules, validate, setPassword);
router.get('/me', protect, me);
router.put('/profile', protect, updateProfileRules, validate, updateProfile);
router.post('/register', protect, authorize('super_admin', 'admin'), registerRules, validate, register);

export default router;
