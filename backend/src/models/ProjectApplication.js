import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const projectApplicationSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    applicantRole: { type: String, enum: ['employee', 'vendor', 'freelancer'], required: true },
    answers: { type: [answerSchema], required: true },
    status: { type: String, enum: ['Submitted', 'Reviewed', 'Shortlisted', 'Rejected'], default: 'Submitted' }
  },
  { timestamps: true }
);

// One account can submit only one application for a project.
projectApplicationSchema.index({ project: 1, applicant: 1 }, { unique: true });

export default mongoose.model('ProjectApplication', projectApplicationSchema);
