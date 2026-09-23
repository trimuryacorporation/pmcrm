import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

dotenv.config();

const email = (process.env.ADMIN_EMAIL || 'superadmin@trimurya.com').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || 'password123';

async function ensureAdmin() {
  await connectDB();

  let user = await User.findOne({ email }).select('+password');
  if (!user) {
    user = new User({ name: 'Super Admin', email, password, role: 'super_admin', isActive: true });
  } else {
    user.name = user.name || 'Super Admin';
    user.password = password;
    user.role = 'super_admin';
    user.isActive = true;
  }

  await user.save();
  console.log(`Super admin is ready: ${email}`);
  await mongoose.disconnect();
}

ensureAdmin().catch(async (error) => {
  console.error(`Could not create super admin: ${error.message}`);
  await mongoose.disconnect();
  process.exit(1);
});
