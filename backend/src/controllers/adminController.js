import User from '../models/User.js';
import { writeAudit } from '../utils/audit.js';

const administratorRoles = ['super_admin', 'admin'];
const publicFields = 'name email role isActive lastLoginAt createdAt';

export async function listAdministrators(req, res, next) {
  try {
    const items = await User.find({ role: { $in: administratorRoles } }).select(publicFields).sort({ createdAt: -1 });
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function createAdministrator(req, res, next) {
  try {
    const email = req.body.email.trim().toLowerCase();
    if (await User.exists({ email })) {
      res.status(409);
      throw new Error('Email already exists');
    }

    const user = await User.create({
      name: req.body.name.trim(),
      email,
      password: req.body.password,
      role: req.body.role
    });
    await writeAudit(req, 'CREATE', 'Administrator', user, { name: user.name, email: user.email, role: user.role });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAdministratorStatus(req, res, next) {
  try {
    const user = await User.findOne({ _id: req.params.id, role: { $in: administratorRoles } });
    if (!user) {
      res.status(404);
      throw new Error('Administrator not found');
    }
    if (String(user._id) === String(req.user._id) && !req.body.isActive) {
      res.status(400);
      throw new Error('You cannot deactivate your own account');
    }
    if (user.role === 'super_admin' && !req.body.isActive) {
      const activeSuperAdmins = await User.countDocuments({ role: 'super_admin', isActive: true });
      if (activeSuperAdmins <= 1) {
        res.status(400);
        throw new Error('At least one active Super Admin is required');
      }
    }

    user.isActive = req.body.isActive;
    await user.save();
    await writeAudit(req, 'UPDATE', 'Administrator', user, { isActive: user.isActive });
    res.json({ _id: user._id, isActive: user.isActive });
  } catch (error) {
    next(error);
  }
}
