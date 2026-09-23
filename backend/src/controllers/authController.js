import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import User from '../models/User.js';
import { clientIp, writeAudit } from '../utils/audit.js';

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

function sendUser(res, user) {
  res.json({
    token: signToken(user),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      lastLoginAt: user.lastLoginAt,
      lastSeenAt: user.lastSeenAt,
      locationSharingEnabled: user.locationSharingEnabled,
      lastLocation: user.lastLocation
    }
  });
}

export const loginRules = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

export const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['super_admin', 'admin', 'employee', 'vendor', 'freelancer'])
];

export const setPasswordRules = [
  body('token').notEmpty().withMessage('Invite token is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
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
    res.status(201);
    sendUser(res, user);
  } catch (error) {
    next(error);
  }
}

export async function me(req, res) {
  res.json({ user: req.user });
}

export async function validateInvite(req, res, next) {
  try {
    const token = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({ passwordSetupToken: token, passwordSetupExpires: { $gt: new Date() } });
    if (!user) {
      res.status(400);
      throw new Error('This invite link is invalid or has expired');
    }
    res.json({ valid: true, email: user.email, name: user.name });
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
    res.json({ message: 'Password set successfully. You can now sign in.' });
  } catch (error) {
    next(error);
  }
}
