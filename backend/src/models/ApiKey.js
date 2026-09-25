import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  keyPrefix: { type: String, required: true, trim: true },
  keyHash: { type: String, required: true, unique: true, select: false },
  role: { type: String, enum: ['super_admin', 'admin'], default: 'admin' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true },
  lastUsedAt: Date
}, { timestamps: true });

apiKeySchema.index({ isActive: 1, createdAt: -1 });

export default mongoose.model('ApiKey', apiKeySchema);
