import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    userName: String,
    role: String,
    action: { type: String, required: true, index: true },
    resource: { type: String, required: true, index: true },
    resourceId: mongoose.Schema.Types.ObjectId,
    summary: String,
    changes: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    location: { latitude: Number, longitude: Number, accuracy: Number },
    occurredAt: { type: Date, default: Date.now, index: true }
  },
  { versionKey: false }
);

export default mongoose.model('AuditLog', auditLogSchema);
