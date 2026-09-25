import crypto from 'crypto';
import ApiKey from '../models/ApiKey.js';

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export async function listApiKeys(req, res, next) {
  try {
    const items = await ApiKey.find().populate('createdBy', 'name email').sort({ createdAt: -1 }).lean();
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function createApiKey(req, res, next) {
  try {
    const secret = `crm_${crypto.randomBytes(30).toString('base64url')}`;
    const key = await ApiKey.create({
      name: req.body.name,
      role: req.body.role || 'admin',
      keyPrefix: secret.slice(0, 12),
      keyHash: hashKey(secret),
      createdBy: req.user._id
    });
    res.status(201).json({
      item: await key.populate('createdBy', 'name email'),
      secret,
      message: 'Copy this API key now. It will not be shown again.'
    });
  } catch (error) {
    next(error);
  }
}

export async function revokeApiKey(req, res, next) {
  try {
    const item = await ApiKey.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!item) {
      res.status(404);
      throw new Error('API key not found');
    }
    res.json({ item, message: 'API key revoked' });
  } catch (error) {
    next(error);
  }
}
