import { body } from 'express-validator';
import { Candidate, Freelancer, Vendor } from '../models/People.js';
import { inviteFreelancer, inviteVendor } from '../services/employeeInviteService.js';
import { ensureUniquePersonContact } from '../services/personContactService.js';

const types = ['candidate', 'vendor', 'freelancer'];

const fieldsByType = {
  candidate: ['fullName', 'email', 'mobile', 'linkedinUrl', 'location', 'language', 'experience', 'availabilityStatus', 'candidateType', 'notes'],
  vendor: ['agencyName', 'contactPerson', 'email', 'linkedinUrl', 'phone', 'address', 'location', 'languagesAvailable', 'languageTeamCounts', 'projectTypes', 'teamCapacity', 'dailyProductionCapacity', 'rate', 'notes'],
  freelancer: ['name', 'email', 'linkedinUrl', 'phone', 'location', 'language', 'languageTeamCounts', 'projectTypes', 'experience', 'availability', 'paymentDetails']
};

const modelByType = { candidate: Candidate, vendor: Vendor, freelancer: Freelancer };
const requiredFieldsByType = {
  candidate: ['fullName', 'email', 'mobile', 'location', 'language', 'experience', 'availabilityStatus', 'candidateType'],
  vendor: ['agencyName', 'contactPerson', 'email', 'phone', 'address', 'location', 'languagesAvailable', 'projectTypes', 'teamCapacity', 'dailyProductionCapacity', 'rate'],
  freelancer: ['name', 'email', 'phone', 'location', 'language', 'projectTypes', 'experience', 'availability']
};

export const onboardingRules = [
  body('type').isIn(types).withMessage('Choose Candidate, Vendor or Freelancer'),
  body('email').isEmail().withMessage('A valid email address is required'),
  body('fullName').if(body('type').equals('candidate')).trim().notEmpty().withMessage('Full name is required'),
  body('mobile').if(body('type').equals('candidate')).trim().notEmpty().withMessage('Mobile number is required'),
  body('agencyName').if(body('type').equals('vendor')).trim().notEmpty().withMessage('Agency name is required'),
  body('contactPerson').if(body('type').equals('vendor')).trim().notEmpty().withMessage('Contact person is required'),
  body('phone').if(body('type').isIn(['vendor', 'freelancer'])).trim().notEmpty().withMessage('Phone number is required'),
  body('name').if(body('type').equals('freelancer')).trim().notEmpty().withMessage('Name is required'),
  body().custom((_, { req }) => {
    const missing = (requiredFieldsByType[req.body.type] || []).find((field) => {
      const value = req.body[field];
      return value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length);
    });
    if (missing) throw new Error(`Complete all required fields before submitting (${missing} is missing)`);
    if (['vendor', 'freelancer'].includes(req.body.type)) {
      const languages = req.body.type === 'vendor' ? req.body.languagesAvailable : req.body.language;
      const counts = Array.isArray(req.body.languageTeamCounts) ? req.body.languageTeamCounts : [];
      if (counts.length !== languages.length || counts.some((item) => !languages.includes(item.language) || !Number.isFinite(Number(item.teamCount)) || Number(item.teamCount) < 0)) throw new Error('Enter a valid team count for every selected language');
    }
    return true;
  })
];

function allowedData(type, bodyData) {
  const allowed = Object.fromEntries(fieldsByType[type].map((field) => [field, bodyData[field]]).filter(([, value]) => value !== undefined));
  if (allowed.email) allowed.email = allowed.email.trim().toLowerCase();
  const arrayFields = ['languagesAvailable', 'projectTypes', ...(type === 'freelancer' ? ['language'] : [])];
  arrayFields.forEach((field) => {
    if (allowed[field] !== undefined) allowed[field] = Array.isArray(allowed[field]) ? allowed[field] : [allowed[field]].filter(Boolean);
  });
  return allowed;
}

export async function submitOnboarding(req, res, next) {
  let person;
  try {
    const type = req.body.type;
    const Model = modelByType[type];
    const data = allowedData(type, req.body);
    const personType = type[0].toUpperCase() + type.slice(1);
    await ensureUniquePersonContact({ type: personType, data });
    person = await Model.create(data);

    if (type === 'vendor') await inviteVendor(person);
    if (type === 'freelancer') await inviteFreelancer(person);

    const message = type === 'candidate'
      ? 'Your candidate profile has been submitted successfully.'
      : 'Your profile has been submitted. Check your email to set up your password.';
    res.status(201).json({ message });
  } catch (error) {
    if (person) await person.deleteOne().catch(() => {});
    next(error);
  }
}
