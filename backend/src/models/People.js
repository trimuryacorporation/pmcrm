import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({ name: String, url: String }, { _id: false });

const candidateSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    mobile: String,
    email: { type: String, lowercase: true, trim: true },
    location: String,
    city: String,
    state: String,
    language: String,
    skills: [String],
    experience: String,
    availabilityStatus: { type: String, default: 'Available' },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', index: true },
    assignedProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    candidateType: { type: String, enum: ['Individual', 'Team Member'], default: 'Individual' },
    documents: [documentSchema],
    notes: String,
    status: { type: String, enum: ['New', 'Contacted', 'Selected', 'Rejected', 'Active', 'Completed'], default: 'New' },
    completedProjectCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const vendorSchema = new mongoose.Schema(
  {
    agencyName: { type: String, required: true, trim: true },
    contactPerson: String,
    email: { type: String, lowercase: true, trim: true },
    phone: String,
    address: String,
    location: String,
    languagesAvailable: [String],
    teamCapacity: { type: Number, default: 0 },
    dailyProductionCapacity: String,
    rate: { type: Number, default: 0 },
    ownerEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', index: true },
    assignedProjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
    paymentStatus: { type: String, enum: ['Pending', 'Partial', 'Paid'], default: 'Pending' },
    status: { type: String, enum: ['Active', 'Inactive', 'Blocked'], default: 'Active' },
    documents: [documentSchema],
    notes: String,
    performanceScore: { type: Number, min: 0, max: 100, default: 75 }
  },
  { timestamps: true }
);

const freelancerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: String,
    location: String,
    language: String,
    skillCategory: String,
    experience: String,
    rate: { type: Number, default: 0 },
    availability: { type: String, default: 'Available' },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', index: true },
    ownerEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', index: true },
    assignedProjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
    completedProjects: { type: Number, default: 0 },
    paymentDetails: String,
    documents: [documentSchema],
    status: { type: String, enum: ['Active', 'Inactive', 'Blocked'], default: 'Active' },
    performanceScore: { type: Number, min: 0, max: 100, default: 80 }
  },
  { timestamps: true }
);

const employeeSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: String,
    department: String,
    designation: String,
    joiningDate: Date,
    skills: [String],
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', index: true },
    assignedProjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
    completedProjectsCount: { type: Number, default: 0 },
    currentWorkload: { type: Number, min: 0, max: 100, default: 0 },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
  },
  { timestamps: true }
);

candidateSchema.index(
  { fullName: 'text', email: 'text', mobile: 'text', language: 'text', skills: 'text' },
  { default_language: 'none', language_override: 'searchLanguage' }
);
vendorSchema.index({ agencyName: 'text', contactPerson: 'text', location: 'text', languagesAvailable: 'text' });
freelancerSchema.index(
  { name: 'text', email: 'text', language: 'text', skillCategory: 'text' },
  { default_language: 'none', language_override: 'searchLanguage' }
);
employeeSchema.index({ name: 'text', email: 'text', employeeId: 'text', department: 'text', skills: 'text' });

export const Candidate = mongoose.model('Candidate', candidateSchema);
export const Vendor = mongoose.model('Vendor', vendorSchema);
export const Freelancer = mongoose.model('Freelancer', freelancerSchema);
export const Employee = mongoose.model('Employee', employeeSchema);
