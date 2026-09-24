import { writeAudit } from '../utils/audit.js';

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function createCrudController(Model, options = {}) {
  const populate = options.populate || '';
  const searchFields = options.searchFields || [];

  function scopeQuery(req, base = {}, operation = 'read') {
    if (['super_admin', 'admin'].includes(req.user.role)) return base;
    const operationScope = operation === 'write' ? options.writeScope : options.readScope;
    const getScope = operationScope || options.userScope;
    if (getScope) return { ...base, ...getScope(req.user) };
    return base;
  }

  function present(item, req) {
    return options.transformRead ? options.transformRead(item, req) : item;
  }

  return {
    async list(req, res, next) {
      try {
        const { q, status, page = 1, limit = 50 } = req.query;
        const filter = {};
        const allowedSearchFields = options.searchFieldsForUser ? options.searchFieldsForUser(req.user) : searchFields;
        if (status) filter.status = status;
        if (q && allowedSearchFields.length) {
          const search = { $regex: escapeRegex(q.trim()), $options: 'i' };
          filter.$or = allowedSearchFields.map((field) => ({ [field]: search }));
        }

        const scoped = scopeQuery(req, filter);
        const skip = (Number(page) - 1) * Number(limit);
        const [items, total] = await Promise.all([
          Model.find(scoped).populate(populate).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
          Model.countDocuments(scoped)
        ]);
        res.json({ items: items.map((item) => present(item, req)), total, page: Number(page), pages: Math.ceil(total / Number(limit)) || 1 });
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
        res.json(present(item, req));
      } catch (error) {
        next(error);
      }
    },
    async create(req, res, next) {
      let item;
      try {
        const data = options.prepareCreate ? await options.prepareCreate(req, req.body) : req.body;
        item = await Model.create(data);
        await writeAudit(req, 'CREATE', options.resourceName || Model.modelName, item, data);
        if (options.afterCreate && options.awaitAfterCreate) await options.afterCreate(item, req.user);
        else if (options.afterCreate) setImmediate(() => options.afterCreate(item, req.user).catch((error) => console.error(`Post-create action failed: ${error.message}`)));
        res.status(201).json(item);
      } catch (error) {
        if (item && options.rollbackOnAfterCreateError) await Model.findByIdAndDelete(item._id).catch(() => {});
        next(error);
      }
    },
    async update(req, res, next) {
      try {
        const data = options.prepareUpdate ? await options.prepareUpdate(req, req.body) : req.body;
        const item = await Model.findOneAndUpdate(scopeQuery(req, { _id: req.params.id }, 'write'), data, {
          new: true,
          runValidators: true
        }).populate(populate);
        if (!item) {
          res.status(404);
          throw new Error('Record not found');
        }
        await writeAudit(req, 'UPDATE', options.resourceName || Model.modelName, item, data);
        res.json(item);
      } catch (error) {
        next(error);
      }
    },
    async remove(req, res, next) {
      try {
        const item = await Model.findOneAndDelete(scopeQuery(req, { _id: req.params.id }, 'write'));
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
