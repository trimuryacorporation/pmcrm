import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema(
  { name: String, key: String, url: String, size: Number, mimeType: String, uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } },
  { timestamps: true, _id: false }
);

const activitySchema = new mongoose.Schema(
  { message: String, actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, type: String },
  { timestamps: true }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true },
    clientName: { type: String, required: true, trim: true },
    projectType: { type: String, trim: true },
    description: String,
    requiredLanguage: String,
    startDate: Date,
    endDate: Date,
    budget: { type: Number, default: 0 },
    paymentRate: { type: Number, default: 0 },
    clientRate: { type: Number, min: 0, default: 0 },
    vendorRate: { type: Number, min: 0, default: 0 },
    freelancerRate: { type: Number, min: 0, default: 0 },
    projectManager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    status: { type: String, enum: ['Pre-Sale', 'Live', 'Not Live', 'On Hold', 'Completed', 'Cancelled', 'Draft', 'Active'], default: 'Pre-Sale' },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
    requiredCandidateCount: { type: Number, default: 0 },
    requiredVendorCount: { type: Number, default: 0 },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    files: [fileSchema],
    notes: String,
    employees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
    vendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
    freelancers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Freelancer' }],
    candidates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' }],
    activityLog: [activitySchema]
  },
  { timestamps: true }
);

projectSchema.index({ name: 'text', code: 'text', clientName: 'text', requiredLanguage: 'text' });

export default mongoose.model('Project', projectSchema);
