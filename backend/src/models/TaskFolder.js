import mongoose from 'mongoose';

const taskFolderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, unique: true }
  },
  { timestamps: true }
);

taskFolderSchema.index({ name: 1 });

export default mongoose.model('TaskFolder', taskFolderSchema);
