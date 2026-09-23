import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import { clientIp, writeAudit } from '../utils/audit.js';
import DeliveryLog from '../models/DeliveryLog.js';

export async function heartbeat(req, res, next) {
  try {
    const lastSeenAt = new Date();
    await User.findByIdAndUpdate(req.user._id, {
      lastSeenAt,
      lastIpAddress: clientIp(req),
      lastUserAgent: req.get('user-agent')
    });
    res.json({ lastSeenAt });
  } catch (error) {
    next(error);
  }
}

export async function updateLocation(req, res, next) {
  try {
    const { latitude, longitude, accuracy, enabled = true } = req.body;
    const update = { locationSharingEnabled: Boolean(enabled) };
    if (enabled) {
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        res.status(400);
        throw new Error('Valid latitude and longitude are required');
      }
      update.lastLocation = { latitude, longitude, accuracy, updatedAt: new Date() };
    }
    await User.findByIdAndUpdate(req.user._id, update, { runValidators: true });
    Object.assign(req.user, update);
    await writeAudit(req, enabled ? 'LOCATION_UPDATED' : 'LOCATION_DISABLED', 'User', req.user);
    res.json({ locationSharingEnabled: update.locationSharingEnabled, lastLocation: update.lastLocation || req.user.lastLocation });
  } catch (error) {
    next(error);
  }
}

export async function listActivity(req, res, next) {
  try {
    const filter = ['super_admin', 'admin'].includes(req.user.role) ? {} : { user: req.user._id };
    const items = await AuditLog.find(filter).populate('user', 'name email role lastSeenAt lastLocation locationSharingEnabled').sort({ occurredAt: -1 }).limit(200);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function listUsers(req, res, next) {
  try {
    const items = await User.find().select('name email role isActive lastLoginAt lastSeenAt lastIpAddress lastUserAgent locationSharingEnabled lastLocation').sort({ lastSeenAt: -1 });
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function listDeliveries(req, res, next) {
  try {
    const items = await DeliveryLog.find().populate('project', 'name code').sort({ createdAt: -1 }).limit(500);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}
