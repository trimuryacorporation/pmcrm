import express from 'express';
import { login, loginRules, me, register, registerRules, setPassword, setPasswordRules, validateInvite } from '../controllers/authController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.post('/login', loginRules, validate, login);
router.get('/invite/:token', validateInvite);
router.post('/set-password', setPasswordRules, validate, setPassword);
router.get('/me', protect, me);
router.post('/register', protect, authorize('super_admin', 'admin'), registerRules, validate, register);

export default router;
