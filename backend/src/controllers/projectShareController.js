import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import Project from '../models/Project.js';
import ProjectShare from '../models/ProjectShare.js';
export const publicProjectFields = ['name', 'code', 'projectType', 'description', 'requiredLanguage', 'startDate', 'endDate', 'status'];
export function presentPublicProject(project) {
  return Object.fromEntries(publicProjectFields.filter((field) => project[field] !== undefined).map((field) => [field, project[field]]));
}
export async function createProjectShare(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !await Project.exists({ _id: req.params.id })) return res.status(404).json({ message: 'Project not found' });
    let share;
    try {
      share = await ProjectShare.findOneAndUpdate({ project: req.params.id }, { $setOnInsert: { token: randomBytes(32).toString('hex') } }, { upsert: true, new: true, runValidators: true });
    } catch (error) {
      if (error.code !== 11000) throw error;
      share = await ProjectShare.findOne({ project: req.params.id });
    }
    res.json({ path: `/shared/projects/${share.token}` });
  } catch (error) { next(error); }
}
export async function getSharedProject(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');
    res.set('X-Robots-Tag', 'noindex, nofollow');
    if (!/^[a-f0-9]{64}$/.test(req.params.token)) return res.status(404).json({ message: 'Share link not found' });
    const share = await ProjectShare.findOne({ token: req.params.token }).lean();
    const project = share && await Project.findById(share.project).select(publicProjectFields.join(' ')).lean();
    if (!project) return res.status(404).json({ message: 'Share link not found' });
    res.json(presentPublicProject(project));
  } catch (error) { next(error); }
}
