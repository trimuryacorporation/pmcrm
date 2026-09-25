import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  { body: String, author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } },
  { timestamps: true }
);

const allocationSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    personType: { type: String, enum: ['Employee', 'Vendor', 'Freelancer', 'Candidate'], required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'Freelancer' },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
    assignmentDate: { type: Date, default: Date.now },
    role: { type: String, enum: ['Project Manager', 'Team Lead', 'Recruiter', 'Annotator', 'Transcriber', 'Reviewer', 'Vendor Partner'], default: 'Annotator' },
    workStatus: { type: String, enum: ['Assigned', 'In Progress', 'Review', 'Completed', 'Paused'], default: 'Assigned' },
    completionPercentage: { type: Number, min: 0, max: 100, default: 0 }
  },
  { timestamps: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: String,
    folder: { type: mongoose.Schema.Types.ObjectId, ref: 'TaskFolder', required: true },
    assignedToType: { type: String, enum: ['Employee', 'Vendor', 'Freelancer', 'Candidate'] },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'Freelancer' },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    dueDate: Date,
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
    status: { type: String, enum: ['To Do', 'In Progress', 'Review', 'Completed'], default: 'To Do' },
    attachments: [{ name: String, url: String }],
    comments: [commentSchema]
  },
  { timestamps: true }
);

export const Allocation = mongoose.model('Allocation', allocationSchema);
export const Task = mongoose.model('Task', taskSchema);
