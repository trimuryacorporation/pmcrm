import AuditLog from '../models/AuditLog.js';

export function clientIp(req) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
}

export async function writeAudit(req, action, resource, item, changes) {
  try {
    await AuditLog.create({
      user: req.user?._id,
      userName: req.user?.name,
      role: req.user?.role,
      action,
      resource,
      resourceId: item?._id,
      summary: item?.name || item?.title || item?.fullName || item?.agencyName || item?.invoiceNumber,
      changes,
      ipAddress: clientIp(req),
      userAgent: req.get('user-agent'),
      location: req.user?.lastLocation
    });
  } catch (error) {
    console.error(`Audit log failed: ${error.message}`);
  }
}
