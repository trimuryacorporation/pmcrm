import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true },
    message: String,
    type: { type: String, enum: ['Project', 'Task', 'Payment', 'Deadline', 'System'], default: 'System' },
    isRead: { type: Boolean, default: false },
    link: String
  },
  { timestamps: true }
);

export default mongoose.model('Notification', notificationSchema);
