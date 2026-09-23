import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { getCommunicationConfig } from '../config/communications.js';
import User from '../models/User.js';

function frontendUrl() {
  const configured = process.env.APP_URL || (process.env.CLIENT_URL || '').split(',').map((value) => value.trim()).find(Boolean);
  return (configured || 'http://localhost:5173').replace(/\/$/, '');
}

export async function inviteEmployee(employee) {
  const email = employee.email?.trim().toLowerCase();
  if (!email) throw new Error('Employee email is required to send an invite');

  const rawToken = crypto.randomBytes(32).toString('hex');
  const passwordSetupToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const temporaryPassword = crypto.randomBytes(32).toString('hex');
  let user = await User.findOne({ email }).select('+passwordSetupToken +passwordSetupExpires');
  const createdUser = !user;
  const previousToken = user?.passwordSetupToken;
  const previousExpiry = user?.passwordSetupExpires;

  try {
    if (user && (user.role !== 'employee' || String(user.linkedEmployee || '') !== String(employee._id))) {
      throw new Error('A different login account already exists for this email');
    }
    if (!user) {
      user = await User.create({
        name: employee.name,
        email,
        password: temporaryPassword,
        role: 'employee',
        linkedEmployee: employee._id,
        passwordSetupToken,
        passwordSetupExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
    } else {
      user.name = employee.name;
      user.passwordSetupToken = passwordSetupToken;
      user.passwordSetupExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();
    }

    const config = (await getCommunicationConfig()).email;
    if (!config.enabled || !config.host || !config.user || !config.password || !config.from) {
      throw new Error('SMTP email settings are not configured');
    }

    const transport = nodemailer.createTransport({
      host: config.host,
      port: Number(config.port),
      secure: Boolean(config.secure),
      auth: { user: config.user, pass: config.password },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000
    });
    const inviteUrl = `${frontendUrl()}/set-password?token=${rawToken}`;
    await transport.sendMail({
      from: config.from,
      to: email,
      subject: 'Set up your CRM account',
      text: `Hello ${employee.name},\n\nYour CRM account has been created. Set your password using this link:\n${inviteUrl}\n\nThis link expires in 24 hours and can only be used once.`
    });
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
