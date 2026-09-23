import nodemailer from 'nodemailer';
import SystemSetting from '../models/SystemSetting.js';
import { getCommunicationConfig } from '../config/communications.js';
import { encrypt } from '../utils/encryption.js';
import { writeAudit } from '../utils/audit.js';

function transporter(email) {
  return nodemailer.createTransport({ host: email.host, port: Number(email.port), secure: Boolean(email.secure), auth: { user: email.user, pass: email.password } });
}

function normalizePhone(phone, countryCode) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length === 10 ? `${countryCode}${digits}` : digits;
}

async function sendWhatsAppTest(config, to, recipientName = 'Test User') {
  const response = await fetch(`https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: normalizePhone(to, config.countryCode), type: 'template', template: {
      name: config.templateName,
      language: { code: config.templateLanguage },
      components: [{ type: 'body', parameters: [
        { type: 'text', text: recipientName }, { type: 'text', text: 'Test Project' }, { type: 'text', text: 'TRM-TEST' }
      ] }]
    } })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'WhatsApp test failed');
  return data.messages?.[0]?.id;
}

export async function getCommunicationSettings(req, res, next) {
  try {
    const config = await getCommunicationConfig();
    res.json({
      email: { ...config.email, password: '', passwordConfigured: Boolean(config.email.password) },
      whatsapp: { ...config.whatsapp, accessToken: '', tokenConfigured: Boolean(config.whatsapp.accessToken) }
    });
  } catch (error) { next(error); }
}

export async function updateCommunicationSettings(req, res, next) {
  try {
    const current = await getCommunicationConfig();
    const email = { ...current.email, ...req.body.email, password: req.body.email?.password || current.email.password };
    const whatsapp = { ...current.whatsapp, ...req.body.whatsapp, accessToken: req.body.whatsapp?.accessToken || current.whatsapp.accessToken };
    if (email.enabled && (!email.host || !email.user || !email.password || !email.from)) throw new Error('Complete SMTP settings are required when email is enabled');
    if (whatsapp.enabled && (!whatsapp.phoneNumberId || !whatsapp.accessToken || !whatsapp.templateName)) throw new Error('Complete WhatsApp settings are required when WhatsApp is enabled');
    const communications = {
      email: { enabled: email.enabled, host: email.host, port: Number(email.port), secure: email.secure, user: email.user, passwordEncrypted: email.password ? encrypt(email.password) : '', from: email.from },
      whatsapp: { enabled: whatsapp.enabled, apiVersion: whatsapp.apiVersion, phoneNumberId: whatsapp.phoneNumberId, accessTokenEncrypted: whatsapp.accessToken ? encrypt(whatsapp.accessToken) : '', templateName: whatsapp.templateName, templateLanguage: whatsapp.templateLanguage, countryCode: whatsapp.countryCode },
      updatedBy: req.user._id
    };
    const setting = await SystemSetting.findOneAndUpdate({ key: 'communications' }, { key: 'communications', communications }, { upsert: true, new: true, runValidators: true });
    await writeAudit(req, 'UPDATE', 'CommunicationSettings', setting, { emailEnabled: email.enabled, whatsappEnabled: whatsapp.enabled });
    res.json({ ok: true, message: 'Email and WhatsApp settings saved securely' });
  } catch (error) { res.status(400); next(error); }
}

export async function testEmail(req, res, next) {
  try {
    const config = await getCommunicationConfig();
    const client = transporter(config.email);
    await client.verify();
    await client.sendMail({ from: config.email.from, to: req.body.to || req.user.email, subject: 'Trimurya CRM email test', text: 'Email notifications are configured successfully.' });
    client.close();
    res.json({ ok: true, message: 'Test email sent successfully' });
  } catch (error) { res.status(400); next(new Error(`Email test failed: ${error.message}`)); }
}

export async function testWhatsApp(req, res, next) {
  try {
    if (!req.body.to) { res.status(400); throw new Error('Test WhatsApp number is required'); }
    const config = await getCommunicationConfig();
    await sendWhatsAppTest(config.whatsapp, req.body.to, req.user.name);
    res.json({ ok: true, message: 'Test WhatsApp message sent successfully' });
  } catch (error) { if (res.statusCode === 200) res.status(400); next(new Error(`WhatsApp test failed: ${error.message}`)); }
}
