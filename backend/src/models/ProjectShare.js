import mongoose from 'mongoose';
export default mongoose.model('ProjectShare', new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, unique: true },
  token: { type: String, required: true, unique: true },
  shortToken: { type: String, unique: true, sparse: true }
}, { timestamps: true }));
