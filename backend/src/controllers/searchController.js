import Project from '../models/Project.js';
import Client from '../models/Client.js';
import { Candidate, Employee, Freelancer, Vendor } from '../models/People.js';
import { Invoice, Payment } from '../models/Finance.js';

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function queryFor(fields, search, scope = {}) {
  return { ...scope, $or: fields.map((field) => ({ [field]: { $regex: search, $options: 'i' } })) };
}

export async function globalSearch(req, res, next) {
  try {
    const term = String(req.query.q || '').trim();
    if (term.length < 2) return res.json({ items: [] });
    const search = escapeRegex(term);
    const user = req.user;
    const isAdmin = ['super_admin', 'admin'].includes(user.role);
    const projectScope = user.role === 'employee' ? { employees: user.linkedEmployee } : user.role === 'vendor' ? { vendors: user.linkedVendor } : user.role === 'freelancer' ? { freelancers: user.linkedFreelancer } : {};
    const vendorScope = user.role === 'vendor' ? { _id: user.linkedVendor } : {};
    const freelancerScope = user.role === 'freelancer' ? { _id: user.linkedFreelancer } : user.role === 'vendor' ? { vendor: user.linkedVendor } : {};
    const candidateScope = user.role === 'vendor' ? { vendor: user.linkedVendor } : {};

    const requests = [
      Project.find(queryFor(['name', 'code', 'clientName'], search, projectScope)).limit(6).lean(),
      Candidate.find(queryFor(['fullName', 'email', 'mobile', 'location'], search, candidateScope)).limit(6).lean(),
      Vendor.find(queryFor(['agencyName', 'contactPerson', 'email', 'phone', 'location'], search, vendorScope)).limit(6).lean(),
      Freelancer.find(queryFor(['name', 'email', 'phone', 'location'], search, freelancerScope)).limit(6).lean()
    ];
    if (isAdmin) requests.push(
      Client.find(queryFor(['name', 'companyName', 'contactPerson', 'email', 'phone', 'location'], search)).limit(6).lean(),
      Employee.find(queryFor(['name', 'employeeId', 'email', 'phone'], search)).limit(6).lean(),
      Payment.find(queryFor(['payeeName', 'status', 'notes'], search)).limit(6).lean(),
      Invoice.find(queryFor(['invoiceNumber', 'payeeName', 'paymentStatus', 'notes'], search)).limit(6).lean()
    );
    const results = await Promise.all(requests);
    const [projects, candidates, vendors, freelancers, clients = [], employees = [], payments = [], invoices = []] = results;
    const items = [
      ...projects.map((item) => ({ id: item._id, type: 'Project', title: item.name, subtitle: item.code || item.clientName, path: `/projects/${item._id}` })),
      ...candidates.map((item) => ({ id: item._id, type: 'Candidate', title: item.fullName, subtitle: item.email || item.mobile, path: `/candidates/${item._id}` })),
      ...vendors.map((item) => ({ id: item._id, type: 'Vendor', title: item.agencyName, subtitle: item.contactPerson || item.email, path: `/vendors/${item._id}` })),
      ...freelancers.map((item) => ({ id: item._id, type: 'Freelancer', title: item.name, subtitle: item.email || item.phone, path: `/freelancers/${item._id}` })),
      ...clients.map((item) => ({ id: item._id, type: 'Client', title: item.name, subtitle: item.companyName || item.contactPerson || item.email, path: `/clients/${item._id}` })),
      ...employees.map((item) => ({ id: item._id, type: 'Employee', title: item.name, subtitle: item.employeeId || item.email, path: `/employees/${item._id}` })),
      ...payments.map((item) => ({ id: item._id, type: 'Payment', title: item.payeeName, subtitle: `${item.status} • ${item.amount}`, path: '/payments' })),
      ...invoices.map((item) => ({ id: item._id, type: 'Invoice', title: item.invoiceNumber, subtitle: `${item.payeeName} • ${item.paymentStatus}`, path: '/payments' }))
    ];
    res.json({ items: items.slice(0, 20) });
  } catch (error) {
    next(error);
  }
}
