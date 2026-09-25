import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import User from '../models/User.js';
import { Candidate, Employee, Freelancer, Vendor } from '../models/People.js';
import { clientIp, writeAudit } from '../utils/audit.js';
import { getCommunicationConfig } from '../config/communications.js';
import { createEmailClient } from '../services/emailClient.js';
import { notifyAdmins } from '../services/adminNotificationService.js';

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

function sendUser(res, user) {
  res.json({
    token: signToken(user),
    user: userResponse(user)
  });
}

function userResponse(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    lastLoginAt: user.lastLoginAt,
    lastSeenAt: user.lastSeenAt,
    locationSharingEnabled: user.locationSharingEnabled,
    lastLocation: user.lastLocation
  };
}

export const loginRules = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

export const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['super_admin', 'admin', 'employee', 'vendor', 'freelancer', 'candidate'])
];

export const setPasswordRules = [
  body('token').notEmpty().withMessage('Invite token is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

export const forgotPasswordRules = [
  body('email').isEmail().withMessage('Valid email is required')
];

export const resetPasswordRules = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

function frontendUrl() {
  const configured = process.env.APP_URL || (process.env.CLIENT_URL || '').split(',').map((value) => value.trim()).find(Boolean);
  return (configured || 'http://localhost:5173').replace(/\/$/, '');
}

export const updateProfileRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('newPassword').optional({ values: 'falsy' }).isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
];

export async function login(req, res, next) {
  try {
    const user = await User.findOne({ email: req.body.email.toLowerCase() }).select('+password');
    if (!user || !(await user.matchPassword(req.body.password))) {
      res.status(401);
      throw new Error('Invalid email or password');
    }
    if (!user.isActive) {
      res.status(403);
      throw new Error('Account is inactive');
    }
    user.lastLoginAt = new Date();
    user.lastSeenAt = new Date();
    user.lastIpAddress = clientIp(req);
    user.lastUserAgent = req.get('user-agent');
    await user.save();
    req.user = user;
    await writeAudit(req, 'LOGIN', 'Authentication', user);
    sendUser(res, user);
  } catch (error) {
    next(error);
  }
}

export async function register(req, res, next) {
  try {
    if (req.user.role === 'admin' && ['admin', 'super_admin'].includes(req.body.role)) {
      res.status(403);
      throw new Error('Only a Super Admin can create administrator accounts');
    }
    const exists = await User.findOne({ email: req.body.email.toLowerCase() });
    if (exists) {
      res.status(409);
      throw new Error('Email already exists');
    }
    const user = await User.create(req.body);
    notifyAdmins(req, 'CREATE', 'User', user).catch((error) => console.error(`Notification failed: ${error.message}`));
    res.status(201);
    sendUser(res, user);
  } catch (error) {
    next(error);
  }
}

export async function me(req, res) {
  res.json({ user: req.user });
}

export async function updateProfile(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select('+password');
    const name = req.body.name.trim();
    const email = req.body.email.trim().toLowerCase();
    const newPassword = String(req.body.newPassword || '');

    if (await User.exists({ email, _id: { $ne: user._id } })) {
      res.status(409);
      throw new Error('Email already exists');
    }
    if (newPassword) {
      if (!req.body.currentPassword || !(await user.matchPassword(req.body.currentPassword))) {
        res.status(400);
        throw new Error('Current password is incorrect');
      }
      user.password = newPassword;
      user.passwordSetAt = new Date();
    }

    user.name = name;
    user.email = email;
    await user.save();

    const linkedUpdates = [];
    if (user.linkedEmployee) linkedUpdates.push(Employee.findByIdAndUpdate(user.linkedEmployee, { name, email }));
    if (user.linkedVendor) linkedUpdates.push(Vendor.findByIdAndUpdate(user.linkedVendor, { contactPerson: name, email }));
    if (user.linkedFreelancer) linkedUpdates.push(Freelancer.findByIdAndUpdate(user.linkedFreelancer, { name, email }));
    if (user.linkedCandidate) linkedUpdates.push(Candidate.findByIdAndUpdate(user.linkedCandidate, { fullName: name, email }));
    await Promise.all(linkedUpdates);

    await writeAudit(req, 'UPDATE', 'Profile', user, { name, email, passwordChanged: Boolean(newPassword) });
    res.json({ message: 'Profile updated successfully', user: userResponse(user) });
  } catch (error) {
    next(error);
  }
}

export async function validateInvite(req, res, next) {
  try {
    const token = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({ passwordSetupToken: token, passwordSetupExpires: { $gt: new Date() } });
    if (!user) {
      res.status(400);
      throw new Error('This invite link is invalid or has expired');
    }
    res.json({ valid: true, email: user.email, name: user.name, role: user.role });
  } catch (error) {
    next(error);
  }
}

export async function setPassword(req, res, next) {
  try {
    const token = crypto.createHash('sha256').update(req.body.token).digest('hex');
    const user = await User.findOne({ passwordSetupToken: token, passwordSetupExpires: { $gt: new Date() } })
      .select('+passwordSetupToken +passwordSetupExpires');
    if (!user) {
      res.status(400);
      throw new Error('This invite link is invalid or has expired');
    }
    user.password = req.body.password;
    user.passwordSetupToken = undefined;
    user.passwordSetupExpires = undefined;
    user.passwordSetAt = new Date();
    await user.save();
    res.json({ message: 'Password set successfully. You can now sign in.', email: user.email, role: user.role });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const email = req.body.email.trim().toLowerCase();
    const user = await User.findOne({ email, isActive: true }).select('+passwordResetToken +passwordResetExpires');

    // Always return the same response so this endpoint cannot reveal registered emails.
    if (!user) return res.json({ message: 'If an active account exists for this email, a reset link has been sent.' });

    const config = (await getCommunicationConfig()).email;
    if (!config.enabled || !config.host || !config.user || !config.password || !config.from) {
      res.status(503);
      throw new Error('Password reset email is unavailable because SMTP settings are not configured');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    try {
      const resetUrl = `${frontendUrl()}/reset-password?token=${rawToken}`;
      const transport = createEmailClient(config);
      await transport.sendMail({
        from: config.from,
        to: user.email,
        subject: 'Reset your CRM password',
        text: `Hello ${user.name},\n\nWe received a request to reset your CRM password. Use this secure link to choose a new password:\n${resetUrl}\n\nThis link expires in 1 hour and can only be used once. If you did not request this, you can safely ignore this email.`,
        html: `<p>Hello ${user.name},</p><p>We received a request to reset your CRM password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 1 hour and can only be used once. If you did not request this, you can safely ignore this email.</p>`
      });
      transport.close();
    } catch (emailError) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      throw emailError;
    }

    res.json({ message: 'If an active account exists for this email, a reset link has been sent.' });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const token = crypto.createHash('sha256').update(req.body.token).digest('hex');
    const user = await User.findOne({ passwordResetToken: token, passwordResetExpires: { $gt: new Date() } })
      .select('+passwordResetToken +passwordResetExpires');
    if (!user) {
      res.status(400);
      throw new Error('This password reset link is invalid or has expired');
    }

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordSetAt = new Date();
    await user.save();
    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (error) {
    next(error);
  }
}
