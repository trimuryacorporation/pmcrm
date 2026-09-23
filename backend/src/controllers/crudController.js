import { writeAudit } from '../utils/audit.js';

export function createCrudController(Model, options = {}) {
  const populate = options.populate || '';
  const searchFields = options.searchFields || [];

  function scopeQuery(req, base = {}) {
    if (['super_admin', 'admin'].includes(req.user.role)) return base;
    if (options.userScope) return { ...base, ...options.userScope(req.user) };
    return base;
  }

  return {
    async list(req, res, next) {
      try {
        const { q, status, page = 1, limit = 50 } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (q && searchFields.length) filter.$text = { $search: q };

        const scoped = scopeQuery(req, filter);
        const skip = (Number(page) - 1) * Number(limit);
        const [items, total] = await Promise.all([
          Model.find(scoped).populate(populate).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
          Model.countDocuments(scoped)
        ]);
        res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) || 1 });
      } catch (error) {
        next(error);
      }
    },
    async get(req, res, next) {
      try {
        const item = await Model.findOne(scopeQuery(req, { _id: req.params.id })).populate(populate);
        if (!item) {
          res.status(404);
          throw new Error('Record not found');
        }
        res.json(item);
      } catch (error) {
        next(error);
      }
    },
    async create(req, res, next) {
      try {
        const item = await Model.create(req.body);
        await writeAudit(req, 'CREATE', options.resourceName || Model.modelName, item, req.body);
        if (options.afterCreate) setImmediate(() => options.afterCreate(item, req.user).catch((error) => console.error(`Post-create action failed: ${error.message}`)));
        res.status(201).json(item);
      } catch (error) {
        next(error);
      }
    },
    async update(req, res, next) {
      try {
        const item = await Model.findOneAndUpdate(scopeQuery(req, { _id: req.params.id }), req.body, {
          new: true,
          runValidators: true
        }).populate(populate);
        if (!item) {
          res.status(404);
          throw new Error('Record not found');
        }
        await writeAudit(req, 'UPDATE', options.resourceName || Model.modelName, item, req.body);
        res.json(item);
      } catch (error) {
        next(error);
      }
    },
    async remove(req, res, next) {
      try {
        const item = await Model.findOneAndDelete(scopeQuery(req, { _id: req.params.id }));
        if (!item) {
          res.status(404);
          throw new Error('Record not found');
        }
        await writeAudit(req, 'DELETE', options.resourceName || Model.modelName, item);
        res.json({ message: 'Record deleted' });
      } catch (error) {
        next(error);
      }
    }
  };
}
