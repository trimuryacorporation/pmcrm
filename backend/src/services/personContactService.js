import { Candidate, Freelancer, Vendor } from '../models/People.js';

const sources = [
  { type: 'Candidate', model: Candidate, phoneField: 'mobile' },
  { type: 'Vendor', model: Vendor, phoneField: 'phone' },
  { type: 'Freelancer', model: Freelancer, phoneField: 'phone' }
];

export function normalizePersonPhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function phonePattern(digits) {
  return new RegExp(`^\\D*${digits.split('').join('\\D*')}\\D*$`);
}

function duplicateError(field, type) {
  const error = new Error(`${field} is already used by an existing ${type.toLowerCase()}`);
  error.statusCode = 409;
  return error;
}

export async function ensureUniquePersonContact({ type, data, id }) {
  const email = String(data.email || '').trim().toLowerCase();
  const phone = normalizePersonPhone(data.phone || data.mobile);
  if (!email && !phone) return;

  const matches = await Promise.all(sources.map(async (source) => {
    const checks = [];
    if (email) checks.push({ email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    if (phone) checks.push({ [source.phoneField]: phonePattern(phone) });
    if (!checks.length) return null;
    const filter = { $or: checks };
    if (source.type === type && id) filter._id = { $ne: id };
    return source.model.findOne(filter).select(`email ${source.phoneField}`).lean();
  }));

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    if (!match) continue;
    const source = sources[index];
    if (email && String(match.email || '').toLowerCase() === email) throw duplicateError('Email', source.type);
    if (phone && normalizePersonPhone(match[source.phoneField]) === phone) throw duplicateError('Phone number', source.type);
  }
}
