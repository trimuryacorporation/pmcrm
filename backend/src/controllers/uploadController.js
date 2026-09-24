import { randomUUID } from 'crypto';
import path from 'path';
import Project from '../models/Project.js';
import { getR2Object, putR2Object } from '../config/r2.js';

function safeFileName(name) {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '-');
}

export async function uploadFiles(req, res, next) {
  try {
    if ((process.env.UPLOAD_DRIVER || 'r2').toLowerCase() !== 'r2') {
      res.status(503);
      throw new Error('Cloudflare R2 upload driver is required');
    }
    const now = new Date();
    const prefix = `projects/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const files = await Promise.all((req.files || []).map(async (file) => {
      const key = `${prefix}/${randomUUID()}-${safeFileName(file.originalname)}`;
      await putR2Object({
        key,
        body: file.buffer,
        contentType: file.mimetype,
        metadata: { uploadedby: String(req.user._id), originalname: encodeURIComponent(file.originalname) }
      });
      return { name: file.originalname, key, size: file.size, mimeType: file.mimetype, uploadedBy: req.user._id };
    }));
    res.status(201).json({ driver: 'r2', files });
  } catch (error) {
    next(error);
  }
}

export async function downloadProjectFile(req, res, next) {
  try {
    // Match the project-list visibility policy: permitted project users can download shared project files.
    const project = await Project.findById(req.params.projectId);
    const file = project?.files?.[Number(req.params.fileIndex)];
    if (!file?.key) {
      res.status(404);
      throw new Error('Project document not found');
    }
    const object = await getR2Object(file.key);
    res.setHeader('Content-Type', object.ContentType || file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName(file.name)}"`);
    if (object.ContentLength) res.setHeader('Content-Length', String(object.ContentLength));
    object.Body.pipe(res);
  } catch (error) {
    next(error);
  }
}
