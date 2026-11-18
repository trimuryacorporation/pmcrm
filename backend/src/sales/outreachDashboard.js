import mongoose from 'mongoose';
import User from '../models/User.js';
import { models } from './models.js';
import { permitted, salesPagePermissions, fail, scope } from './security.js';
import { resources } from './config.js';
import { populateQuery } from './store.js';

const outreachModules = [
  { resource: 'emails', page: 'email-outreach', label: 'Email Outreach' },
  { resource: 'linkedin', page: 'linkedin-outreach', label: 'LinkedIn Outreach' },
  { resource: 'calls', page: 'calls', label: 'Calls & Communication' },
  { resource: 'meetings', page: 'meetings', label: 'Meetings & Calendar' },
  { resource: 'followups', page: 'follow-ups', label: 'Follow-ups' },
  { resource: 'activities', page: 'communications', label: 'Communication History' }
];
const detailFields = 'recordId name subject summary type status callType outcome startsAt dueDate scheduledAt createdAt createdBy assignedTo company lead contact deal';

function dateRange(req) {
  const range = {};
  if (req.query.from) {
    range.$gte = new Date(req.query.from);
    if (Number.isNaN(range.$gte.getTime())) fail('Invalid start date');
  }
  if (req.query.to) {
    range.$lte = new Date(req.query.to);
    if (Number.isNaN(range.$lte.getTime())) fail('Invalid end date');
    if (String(req.query.to).length === 10) range.$lte.setUTCHours(23, 59, 59, 999);
  }
  return range;
}

function cursorFor(req, available) {
  if (!req.query.afterDate && !req.query.afterId && !req.query.afterModule) return null;
  const date = new Date(req.query.afterDate);
  if (Number.isNaN(date.getTime()) || !mongoose.isValidObjectId(req.query.afterId)) fail('Invalid outreach report cursor');
  const module = available.find(item => item.resource === req.query.afterModule);
  if (!module) fail('Invalid outreach report cursor');
  return { date, id: new mongoose.Types.ObjectId(req.query.afterId), module };
}

function cursorFilter(cursor, module, available) {
  if (!cursor) return null;
  const moduleIndex = available.indexOf(module), cursorIndex = available.indexOf(cursor.module);
  const idFilter = moduleIndex > cursorIndex ? { $lte: cursor.id } : { $lt: cursor.id };
  return { $or: [
    { createdAt: { $lt: cursor.date } },
    { createdAt: cursor.date, _id: idFilter }
  ] };
}

function rowFor(item, module) {
  const related = item.company || item.lead || item.contact || item.deal;
  return {
    _id: item._id,
    recordId: item.recordId,
    resource: module.resource,
    page: module.page,
    module: module.label,
    title: item.name || item.subject || item.summary || item.type || item.recordId,
    related: related?.name || related?.recordId || '',
    createdBy: item.createdBy?.name || 'Unknown user',
    createdAt: item.createdAt,
    status: item.status || item.outcome || item.callType || ''
  };
}

export async function outreachDashboard(req) {
  const available = outreachModules.filter(module =>
    salesPagePermissions(req.sales, module.page).view && permitted(req, module.resource, 'view')
  );
  if (!available.length) return { total: 0, modules: [], contributors: [], rows: [], nextCursor: null, pageSize: 25 };

  const requestedModule = String(req.query.module || 'all');
  if (requestedModule !== 'all' && !available.some(module => module.resource === requestedModule)) {
    fail('You do not have access to this outreach module', 403);
  }
  const dateFilter = dateRange(req);
  const assignedTo = req.query.assignedTo;
  let assignedFilter = null;
  if (assignedTo) {
    if (!req.sales.allRecords || !mongoose.isValidObjectId(assignedTo)) fail('Invalid employee filter');
    assignedFilter = { assignedTo: new mongoose.Types.ObjectId(assignedTo) };
  }
  let employeeFilter = null;
  if (req.query.department || req.query.vertical) {
    const teamFilter = {
      $and: [
        await scope(req, 'team'),
        {
          ...(req.query.department ? { department: String(req.query.department) } : {}),
          ...(req.query.vertical ? { vertical: String(req.query.vertical) } : {})
        }
      ]
    };
    employeeFilter = { createdBy: { $in: await models.team.distinct('user', teamFilter) } };
  }
  const baseClauses = [
    ...(req.sales.superAdmin ? [] : [{ createdBy: new mongoose.Types.ObjectId(req.sales.userId) }]),
    ...(Object.keys(dateFilter).length ? [{ createdAt: dateFilter }] : []),
    ...(assignedFilter ? [assignedFilter] : []),
    ...(employeeFilter ? [employeeFilter] : [])
  ];
  const summary = await Promise.all(available.map(async module => {
    const moduleClauses = [...baseClauses];
    if (req.query.serviceCategory && resources[module.resource].fields.some(field => field.key === 'serviceCategory')) {
      moduleClauses.push({ serviceCategory: String(req.query.serviceCategory) });
    }
    const baseFilter = moduleClauses.length ? { $and: moduleClauses } : {};
    const groups = await models[module.resource].aggregate([
      { $match: baseFilter },
      { $group: { _id: '$createdBy', count: { $sum: 1 } } }
    ]);
    return { ...module, count: groups.reduce((total, item) => total + item.count, 0), groups, clauses: moduleClauses };
  }));
  const contributorCounts = new Map();
  for (const module of summary) {
    for (const item of module.groups) {
      const id = String(item._id);
      const contributor = contributorCounts.get(id) || { user: id, count: 0, modules: {} };
      contributor.count += item.count;
      contributor.modules[module.resource] = item.count;
      contributorCounts.set(id, contributor);
    }
  }
  const contributorIds = [...contributorCounts.keys()].filter(id => mongoose.isValidObjectId(id));
  const users = await User.find({ _id: { $in: contributorIds } }).select('name').lean();
  const names = new Map(users.map(user => [String(user._id), user.name]));
  const contributors = [...contributorCounts.values()]
    .map(item => ({ ...item, name: names.get(item.user) || 'Unknown user' }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const pageSize = Math.max(1, Math.min(50, Number(req.query.limit) || 25));
  const cursor = cursorFor(req, available);
  const selected = requestedModule === 'all' ? available : available.filter(item => item.resource === requestedModule);
  const batches = await Promise.all(selected.map(async module => {
    const clauses = [...summary.find(item => item.resource === module.resource).clauses];
    const after = cursorFilter(cursor, module, available);
    if (after) clauses.push(after);
    const filter = clauses.length ? { $and: clauses } : {};
    const records = await populateQuery(
      models[module.resource].find(filter).select(detailFields).sort({ createdAt: -1, _id: -1 }).limit(pageSize + 1),
      module.resource
    ).lean();
    return records.map(item => rowFor(item, module));
  }));
  const rows = batches.flat().sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt) ||
    String(b._id).localeCompare(String(a._id)) ||
    available.findIndex(item => item.resource === a.resource) - available.findIndex(item => item.resource === b.resource)
  );
  const hasMore = rows.length > pageSize;
  const visibleRows = rows.slice(0, pageSize);
  const last = visibleRows[visibleRows.length - 1];

  return {
    total: summary.reduce((total, item) => total + item.count, 0),
    modules: summary.map(({ resource, page, label, count }) => ({ resource, page, label, count })),
    contributors,
    rows: visibleRows,
    nextCursor: hasMore && last ? { createdAt: last.createdAt, id: String(last._id), module: last.resource } : null,
    pageSize
  };
}
