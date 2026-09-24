import { body } from 'express-validator';
import Project from '../models/Project.js';
import ProjectApplication from '../models/ProjectApplication.js';

const requiredApplicationQuestions = [
  'Contact number',
  'Email address',
  'Location / address',
  'Contact person',
  'Department / designation',
  'Experience and availability',
  'Languages, skills and project types',
  'Team size / daily capacity',
  'Current status',
  'Additional application answers'
];

function questionsFor(project) {
  const additional = project.applicationQuestions?.map((question) => String(question).trim()).filter(Boolean) || [];
  return [...requiredApplicationQuestions, ...additional.filter((question) => !requiredApplicationQuestions.includes(question))];
}

export const applicationRules = [
  body('answers').isArray({ min: 1 }).withMessage('Please answer all application questions'),
  body('answers.*.question').trim().notEmpty().withMessage('Application question is required'),
  body('answers.*.answer').trim().notEmpty().withMessage('Please answer every application question')
];

export async function getMyProjectApplication(req, res, next) {
  try {
    const application = await ProjectApplication.findOne({ project: req.params.id, applicant: req.user._id })
      .select('status createdAt')
      .lean();
    res.json({ applied: Boolean(application), application });
  } catch (error) {
    next(error);
  }
}

export async function listProjectApplications(req, res, next) {
  try {
    const applications = await ProjectApplication.find({ project: req.params.id })
      .populate({
        path: 'applicant',
        select: 'name email role linkedEmployee linkedVendor linkedFreelancer',
        populate: [
          { path: 'linkedEmployee' },
          { path: 'linkedVendor' },
          { path: 'linkedFreelancer' }
        ]
      })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ applications, total: applications.length });
  } catch (error) {
    next(error);
  }
}

export async function submitProjectApplication(req, res, next) {
  try {
    const project = await Project.findById(req.params.id).select('name code applicationQuestions');
    if (!project) {
      res.status(404);
      throw new Error('Project not found');
    }

    const requiredQuestions = questionsFor(project);
    const answers = req.body.answers.map((item) => ({
      question: String(item.question || '').trim(),
      answer: String(item.answer || '').trim()
    }));
    const matchesRequirements = answers.length === requiredQuestions.length
      && answers.every((item, index) => item.question === requiredQuestions[index] && item.answer);
    if (!matchesRequirements) {
      res.status(400);
      throw new Error('Please answer all current project application questions');
    }

    const application = await ProjectApplication.create({
      project: project._id,
      applicant: req.user._id,
      applicantRole: req.user.role,
      answers
    });

    res.status(201).json({ message: 'Application submitted successfully.', application });
  } catch (error) {
    if (error.code === 11000) {
      error.statusCode = 409;
      error.message = 'You have already applied to this project';
    }
    next(error);
  }
}
