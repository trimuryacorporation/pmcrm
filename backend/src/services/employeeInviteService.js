import crypto from 'crypto';
import { getCommunicationConfig } from '../config/communications.js';
import User from '../models/User.js';
import { createEmailClient } from './emailClient.js';

function frontendUrl() {
  const configured = process.env.APP_URL || (process.env.CLIENT_URL || '').split(',').map((value) => value.trim()).find(Boolean);
  return (configured || 'http://localhost:5173').replace(/\/$/, '');
}

const roleProfile = {
  employee: { link: 'linkedEmployee', name: (person) => person.name },
  vendor: { link: 'linkedVendor', name: (person) => person.contactPerson || person.agencyName },
  freelancer: { link: 'linkedFreelancer', name: (person) => person.name },
  candidate: { link: 'linkedCandidate', name: (person) => person.fullName }
};

export async function invitePerson(person, role) {
  const email = person.email?.trim().toLowerCase();
  const profile = roleProfile[role];
  if (!profile) throw new Error('Unsupported account role');
  if (!email) throw new Error(`${role} email is required to send an invite`);
  const name = profile.name(person);

  const rawToken = crypto.randomBytes(32).toString('hex');
  const passwordSetupToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const temporaryPassword = crypto.randomBytes(32).toString('hex');
  let user = await User.findOne({ email }).select('+passwordSetupToken +passwordSetupExpires');
  const createdUser = !user;
  const previousToken = user?.passwordSetupToken;
  const previousExpiry = user?.passwordSetupExpires;

  try {
    if (user && (user.role !== role || String(user[profile.link] || '') !== String(person._id))) {
      throw new Error('A different login account already exists for this email');
    }
    if (!user) {
      user = await User.create({
        name,
        email,
        password: temporaryPassword,
        role,
        [profile.link]: person._id,
        passwordSetupToken,
        passwordSetupExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
    } else {
      user.name = name;
      user.passwordSetupToken = passwordSetupToken;
      user.passwordSetupExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();
    }

    const config = (await getCommunicationConfig()).email;
    if (!config.enabled || !config.host || !config.user || !config.password || !config.from) {
      throw new Error('SMTP email settings are not configured');
    }

    const transport = createEmailClient(config);
    const inviteUrl = `${frontendUrl()}/set-password?token=${rawToken}`;
    await transport.sendMail({
      from: config.from,
      to: email,
      subject: 'Set up your CRM account',
      text: `Hello ${name},\n\nYour CRM account has been created. Set your password using this secure link:\n${inviteUrl}\n\nThis link expires in 24 hours and can only be used once. After setup, sign in with this email: ${email}\nLogin platform: ${frontendUrl()}/login`
    });
    transport.close();
  } catch (error) {
    if (createdUser && user) await User.findByIdAndDelete(user._id).catch(() => {});
    else if (user) {
      user.passwordSetupToken = previousToken;
      user.passwordSetupExpires = previousExpiry;
      await user.save().catch(() => {});
    }
    throw error;
  }
}

export const inviteEmployee = (employee) => invitePerson(employee, 'employee');
export const inviteVendor = (vendor) => invitePerson(vendor, 'vendor');
export const inviteFreelancer = (freelancer) => invitePerson(freelancer, 'freelancer');
export const inviteCandidate = (candidate) => invitePerson(candidate, 'candidate');
