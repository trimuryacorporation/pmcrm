import Project from '../models/Project.js';
import { Candidate, Employee, Freelancer, Vendor } from '../models/People.js';
import { Invoice, Payment } from '../models/Finance.js';

const registry = {
  projects: Project,
  employees: Employee,
  vendors: Vendor,
  freelancers: Freelancer,
  candidates: Candidate,
  payments: Payment,
  invoices: Invoice
};

function toCsv(rows) {
  const plain = rows.map((row) => JSON.parse(JSON.stringify(row)));
  const headers = [...new Set(plain.flatMap((row) => Object.keys(row)))];
  return [
    headers.join(','),
    ...plain.map((row) => headers.map((key) => JSON.stringify(row[key] ?? '')).join(','))
  ].join('\n');
}

export async function getReport(req, res, next) {
  try {
    const { type = 'projects', status, from, to, format } = req.query;
    const Model = registry[type];
    if (!Model) {
      res.status(400);
      throw new Error('Invalid report type');
    }
    const filter = {};
    if (status) filter.status = status;
    if (from || to) filter.createdAt = { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(to) } : {}) };
    const rows = await Model.find(filter).sort({ createdAt: -1 }).limit(1000);
    if (format === 'csv') {
      res.header('Content-Type', 'text/csv');
      res.attachment(`${type}-report.csv`);
      return res.send(toCsv(rows));
    }
    res.json({ type, total: rows.length, rows });
  } catch (error) {
    next(error);
  }
}
