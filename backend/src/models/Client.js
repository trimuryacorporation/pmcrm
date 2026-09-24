import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    companyName: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    location: { type: String, trim: true },
    country: { type: String, trim: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

clientSchema.index({ name: 'text', companyName: 'text', contactPerson: 'text', email: 'text', phone: 'text' });

export default mongoose.model('Client', clientSchema);
