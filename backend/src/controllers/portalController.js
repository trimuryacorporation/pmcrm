import Portal from '../models/Portal.js';
import { writeAudit } from '../utils/audit.js';
import { decrypt, encrypt } from '../utils/encryption.js';

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

export async function listPortals(req, res, next) {
  try {
    const { q = '', field = 'all', page = 1, limit = 100 } = req.query;
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 100);
    const allowedFields = ['companyName', 'contactPerson', 'email', 'loginId', 'url'];
    const filter = {};
    if (String(q).trim()) {
      const search = { $regex: escapeRegex(String(q).trim()), $options: 'i' };
      filter.$or = field !== 'all' && allowedFields.includes(field)
        ? [{ [field]: search }]
        : allowedFields.map((name) => ({ [name]: search }));
    }
    const [items, total] = await Promise.all([
      Portal.find(filter).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
      Portal.countDocuments(filter)
    ]);
    res.json({ items, total, page: safePage, pages: Math.ceil(total / safeLimit) || 1 });
  } catch (error) {
    next(error);
  }
}

export async function getPortalCredential(req, res, next) {
  try {
    const portal = await Portal.findById(req.params.id).select('+passwordEncrypted').lean();
    if (!portal) {
      res.status(404);
      throw new Error('Portal not found');
    }
    res.json({ loginId: portal.loginId, password: decrypt(portal.passwordEncrypted) });
  } catch (error) {
    next(error);
  }
}

export async function createPortal(req, res, next) {
  try {
    const url = validUrl(req.body.url);
    const companyName = String(req.body.companyName || '').trim();
    const contactPerson = String(req.body.contactPerson || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const loginId = String(req.body.loginId || '').trim();
    const password = String(req.body.password || '');
    if (!url) {
      res.status(400);
      throw new Error('Enter a valid http:// or https:// portal URL');
    }
    if (!companyName || !contactPerson || !/^\S+@\S+\.\S+$/.test(email) || !loginId || !password) {
      res.status(400);
      throw new Error('Company, contact person, email, portal login ID, and password are required');
    }
    const portal = await Portal.create({ url, companyName, contactPerson, email, loginId, passwordEncrypted: encrypt(password), createdBy: req.user._id });
    await writeAudit(req, 'CREATE', 'Portal', portal, { url, companyName, contactPerson, email, loginId });
    res.status(201).json({ message: 'Portal credentials saved successfully', item: portal });
  } catch (error) {
    next(error);
  }
}