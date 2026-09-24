import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

export const ROLES = ['super_admin', 'admin', 'employee', 'vendor', 'freelancer', 'candidate'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ROLES, default: 'employee' },
    linkedEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    linkedVendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    linkedFreelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'Freelancer' },
    linkedCandidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
    passwordSetupToken: { type: String, select: false },
    passwordSetupExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    passwordSetAt: Date,
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

userSchema.index({ passwordSetupToken: 1 }, { sparse: true });
userSchema.index({ passwordResetToken: 1 }, { sparse: true });

export default mongoose.model('User', userSchema);
