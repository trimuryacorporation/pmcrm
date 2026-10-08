import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import path from 'node:path';
import Project from '../models/Project.js';
import ProjectShare from '../models/ProjectShare.js';
import { getR2Object } from '../config/r2.js';
export const publicProjectFields = ['name', 'code', 'projectType', 'description', 'requiredLanguage', 'applicationQuestions', 'startDate', 'endDate', 'status', 'progress', 'notes'];
export function presentPublicProject(project) {
  return {
    ...Object.fromEntries(publicProjectFields.filter((field) => project[field] !== undefined).map((field) => [field, project[field]])),
    files: (project.files || []).map((file, index) => ({ name: file.name, index }))
  };
}
export function shareFilter(token) {
  if (/^[A-Za-z0-9_-]{16}$/.test(token || '')) return { shortToken: token };
  if (/^[a-f0-9]{64}$/.test(token || '')) return { token };
  return null;
}
async function findSharedProject(token, fields) {
  const filter = shareFilter(token);
  if (!filter) return null;
  const share = await ProjectShare.findOne(filter).lean();
  return share && Project.findById(share.project).select(fields).lean();
}
export async function createProjectShare(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !await Project.exists({ _id: req.params.id })) return res.status(404).json({ message: 'Project not found' });
    let share;
    try {
      share = await ProjectShare.findOneAndUpdate({ project: req.params.id }, { $setOnInsert: { token: randomBytes(32).toString('hex'), shortToken: randomBytes(12).toString('base64url') } }, { upsert: true, new: true, runValidators: true });
    } catch (error) {
      if (error.code !== 11000) throw error;
      share = await ProjectShare.findOne({ project: req.params.id });
      if (!share) throw error;
    }
    if (!share.shortToken) {
      share = await ProjectShare.findOneAndUpdate({ project: req.params.id, shortToken: { $exists: false } }, { $set: { shortToken: randomBytes(12).toString('base64url') } }, { new: true, runValidators: true }) || await ProjectShare.findOne({ project: req.params.id });
    }
    res.json({ path: `/p/${share.shortToken}` });
  } catch (error) { next(error); }
}
export async function getSharedProject(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');
    res.set('X-Robots-Tag', 'noindex, nofollow');
    const project = await findSharedProject(req.params.token, [...publicProjectFields, 'files'].join(' '));
    if (!project) return res.status(404).json({ message: 'Share link not found' });
    res.json(presentPublicProject(project));
  } catch (error) { next(error); }
}
export async function downloadSharedProjectFile(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');
    res.set('X-Robots-Tag', 'noindex, nofollow');
    if (!/^\d+$/.test(req.params.fileIndex)) return res.status(404).json({ message: 'Project document not found' });
    const project = await findSharedProject(req.params.token, 'files');
    const file = project?.files?.[Number(req.params.fileIndex)];
    if (!file) return res.status(404).json({ message: 'Project document not found' });
    if (!file.key) {
      if (/^https?:\/\//i.test(file.url || '') || /^\/uploads\//.test(file.url || '')) return res.redirect(file.url);
      return res.status(404).json({ message: 'Project document not found' });
    }
    const object = await getR2Object(file.key);
    const name = path.basename(file.name || 'document').replace(/[^a-zA-Z0-9._-]/g, '-');
    res.setHeader('Content-Type', object.ContentType || file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    if (object.ContentLength) res.setHeader('Content-Length', String(object.ContentLength));
    object.Body.on('error', (error) => { if (res.headersSent) res.destroy(error); else next(error); });
    object.Body.pipe(res);
  } catch (error) { next(error); }
}
