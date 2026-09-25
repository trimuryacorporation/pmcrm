import Notification from '../models/Notification.js';
import User from '../models/User.js';

const links = {
  Project: '/projects',
  Client: '/clients',
  Candidate: '/candidates',
  Vendor: '/vendors',
  Freelancer: '/freelancers',
  Employee: '/employees',
  Allocation: '/allocation',
  Task: '/tasks',
  TaskFolder: '/tasks',
  Payment: '/payments',
  Invoice: '/payments'
};

function recordName(item, resource) {
  return item?.name || item?.title || item?.fullName || item?.agencyName || item?.invoiceNumber || item?.employeeId || resource;
}

export async function notifyAdmins(req, action, resource, item) {
  if (resource === 'Notification') return;
  const admins = await User.find({ role: { $in: ['super_admin', 'admin'] }, isActive: true }).select('_id');
  if (!admins.length) return;

  const verb = { CREATE: 'created', UPDATE: 'updated', DELETE: 'deleted' }[action] || action.toLowerCase();
  const name = recordName(item, resource);
  const baseLink = links[resource] || '/dashboard';
  const link = ['Project', 'Client', 'Candidate', 'Vendor', 'Freelancer', 'Employee'].includes(resource) && item?._id ? `${baseLink}/${item._id}` : baseLink;
  const actor = req.user?.name || 'A user';

  await Notification.insertMany(admins.map((admin) => ({
    user: admin._id,
    title: `${resource} ${verb}`,
    message: `${actor} ${verb} ${resource.toLowerCase()} “${name}”.`,
    type: 'System',
    link
  })));
}
