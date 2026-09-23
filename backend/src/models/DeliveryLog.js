import mongoose from 'mongoose';

const deliveryLogSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    recipientType: { type: String, enum: ['Employee', 'Vendor', 'Freelancer'], required: true },
    recipientId: mongoose.Schema.Types.ObjectId,
    recipientName: String,
    channel: { type: String, enum: ['email', 'whatsapp'], required: true },
    destination: String,
    status: { type: String, enum: ['queued', 'sent', 'failed', 'skipped'], default: 'queued', index: true },
    providerMessageId: String,
    error: String,
    sentAt: Date
  },
  { timestamps: true }
);

export default mongoose.model('DeliveryLog', deliveryLogSchema);
