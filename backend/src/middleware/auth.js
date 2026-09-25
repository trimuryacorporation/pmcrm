import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import ApiKey from '../models/ApiKey.js';
import User from '../models/User.js';

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const suppliedApiKey = req.headers['x-api-key'] || (header.startsWith('ApiKey ') ? header.slice(7).trim() : '');
    if (suppliedApiKey) {
      const keyHash = crypto.createHash('sha256').update(suppliedApiKey).digest('hex');
      const apiKey = await ApiKey.findOne({ keyHash, isActive: true }).select('+keyHash');
      if (!apiKey) {
        res.status(401);
        throw new Error('Invalid or revoked API key');
      }
      req.user = { _id: apiKey.createdBy, role: apiKey.role, isApiKey: true, apiKeyId: apiKey._id };
      ApiKey.updateOne({ _id: apiKey._id }, { lastUsedAt: new Date() }).catch(() => {});
      return next();
    }
    const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;
    if (!token) {
      res.status(401);
      throw new Error('Authentication token required');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      res.status(401);
      throw new Error('User not authorized');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      res.status(403);
      return next(new Error('You do not have permission to perform this action'));
    }
    next();
  };
}
