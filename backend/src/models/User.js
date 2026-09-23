import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

export const ROLES = ['super_admin', 'admin', 'employee', 'vendor', 'freelancer'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ROLES, default: 'employee' },
    linkedEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    linkedVendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    linkedFreelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'Freelancer' },
    avatar: String,
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
    lastSeenAt: Date,
    lastIpAddress: String,
    lastUserAgent: String,
    locationSharingEnabled: { type: Boolean, default: false },
    lastLocation: {
      latitude: Number,
      longitude: Number,
      accuracy: Number,
      updatedAt: Date
    }
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = function matchPassword(password) {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model('User', userSchema);
