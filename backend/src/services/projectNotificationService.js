import DeliveryLog from '../models/DeliveryLog.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { Employee, Freelancer, Vendor } from '../models/People.js';
import { getCommunicationConfig } from '../config/communications.js';
import { createEmailClient } from './emailClient.js';

function emailTransport(config) {
  if (!config.enabled || !config.host || !config.user || !config.password) return null;
  return createEmailClient(config, { pool: true });
}

function whatsappNumber(phone, countryCode) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `${countryCode || '91'}${digits}`;
  return digits;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

async function updateLog(log, status, details = {}) {
  await DeliveryLog.findByIdAndUpdate(log._id, { status, ...details, ...(status === 'sent' ? { sentAt: new Date() } : {}) });
}

async function sendEmail(project, recipient, type, transport, config) {
  const destination = recipient.email;
  const log = await DeliveryLog.create({ project: project._id, recipientType: type, recipientId: recipient._id, recipientName: recipient.name, channel: 'email', destination, status: destination && transport ? 'queued' : 'skipped' });
  if (!destination || !transport) return;
  try {
    const deadline = project.endDate ? new Date(project.endDate).toLocaleDateString('en-IN') : 'To be confirmed';
    const loginUrl = (process.env.APP_URL || (process.env.CLIENT_URL || '').split(',').map((value) => value.trim()).find((value) => value.startsWith('http')) || 'http://localhost:5173').replace(/\/$/, '') + '/login';
    const recipientName = escapeHtml(recipient.name);
    const projectName = escapeHtml(project.name);
    const projectCode = escapeHtml(project.code);
    const projectDeadline = escapeHtml(deadline);
    const projectPriority = escapeHtml(project.priority);
    const info = await transport.sendMail({
      from: config.from || config.user,
      to: destination,
      subject: `New project assigned: ${project.name}`,
      text: `Hello ${recipient.name},\n\nA new project has been assigned to you in Trimurya Enterprise CRM.\n\nProject: ${project.name}\nCode: ${project.code}\nDeadline: ${deadline}\nPriority: ${project.priority}\n\nLog in to review the project: ${loginUrl}`,
      html: `<div style="margin:0;padding:32px 16px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.12)"><tr><td style="padding:28px 32px;background:linear-gradient(135deg,#111827,#312e81);color:#ffffff"><div style="font-size:13px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#c7d2fe">Trimurya Enterprise CRM</div><h1 style="margin:10px 0 0;font-size:26px;line-height:34px;color:#ffffff">New project assigned</h1></td></tr><tr><td style="padding:32px"><p style="margin:0 0 14px;font-size:16px;line-height:24px">Hello <strong>${recipientName}</strong>,</p><p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#475569">A new project is available for you. Review the assignment details and continue your work in CRM.</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc"><tr><td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b">PROJECT</td><td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:700;text-align:right;color:#0f172a">${projectName}</td></tr><tr><td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b">PROJECT CODE</td><td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:700;text-align:right;color:#0f172a">${projectCode}</td></tr><tr><td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b">DEADLINE</td><td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:700;text-align:right;color:#0f172a">${projectDeadline}</td></tr><tr><td style="padding:14px 16px;font-size:13px;color:#64748b">PRIORITY</td><td style="padding:14px 16px;font-size:14px;font-weight:700;text-align:right;color:#4f46e5">${projectPriority}</td></tr></table><div style="margin-top:28px;text-align:center"><a href="${loginUrl}" style="display:inline-block;border-radius:8px;background:#4f46e5;padding:13px 22px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">Open CRM</a></div><p style="margin:28px 0 0;font-size:12px;line-height:18px;text-align:center;color:#94a3b8">This notification was sent by Trimurya Enterprise CRM.</p></td></tr></table></div>`
    });
    await updateLog(log, 'sent', { providerMessageId: info.messageId });
  } catch (error) {
    await updateLog(log, 'failed', { error: error.message });
  }
}

async function sendWhatsApp(project, recipient, type, config) {
  const destination = whatsappNumber(recipient.phone, config.countryCode);
  const configured = config.enabled && config.phoneNumberId && config.accessToken && config.templateName;
  const log = await DeliveryLog.create({ project: project._id, recipientType: type, recipientId: recipient._id, recipientName: recipient.name, channel: 'whatsapp', destination, status: destination && configured ? 'queued' : 'skipped' });
  if (!destination || !configured) return;
  try {
    const response = await fetch(`https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: destination,
        type: 'template',
        template: {
          name: config.templateName,
          language: { code: config.templateLanguage || 'en_US' },
          components: [{ type: 'body', parameters: [
            { type: 'text', text: recipient.name },
            { type: 'text', text: project.name },
            { type: 'text', text: project.code }
          ] }]
        }
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'WhatsApp API request failed');
    await updateLog(log, 'sent', { providerMessageId: data.messages?.[0]?.id });
  } catch (error) {
    await updateLog(log, 'failed', { error: error.message });
  }
}

export async function notifyProjectCreated(project) {
  const config = await getCommunicationConfig();
  const explicit = project.projectManager || project.employees?.length || project.vendors?.length || project.freelancers?.length;
  const employeeIds = [...new Set([project.projectManager, ...(project.employees || [])].filter(Boolean).map(String))];
  const [employees, vendors, freelancers] = await Promise.all([
    Employee.find(explicit ? { _id: { $in: employeeIds }, status: 'Active' } : { status: 'Active' }),
    Vendor.find(explicit ? { _id: { $in: project.vendors || [] }, status: 'Active' } : { status: 'Active' }),
    Freelancer.find(explicit ? { _id: { $in: project.freelancers || [] }, status: 'Active' } : { status: 'Active' })
  ]);
  const recipients = [
    ...employees.map((person) => ({ person, type: 'Employee' })),
    ...vendors.map((person) => ({ person: { ...person.toObject(), name: person.agencyName }, type: 'Vendor' })),
    ...freelancers.map((person) => ({ person, type: 'Freelancer' }))
  ];
  const transport = emailTransport(config.email);
  await Promise.allSettled(recipients.flatMap(({ person, type }) => [sendEmail(project, person, type, transport, config.email), sendWhatsApp(project, person, type, config.whatsapp)]));
  if (transport) transport.close();

  const linkedUsers = await User.find({ $or: [
    { linkedEmployee: { $in: employees.map((item) => item._id) } },
    { linkedVendor: { $in: vendors.map((item) => item._id) } },
    { linkedFreelancer: { $in: freelancers.map((item) => item._id) } }
  ] });
  await Notification.insertMany(linkedUsers.map((user) => ({ user: user._id, title: 'New project assigned', message: `${project.name} (${project.code}) is now available`, type: 'Project', link: `/projects/${project._id}` })));
}
