import nodemailer from 'nodemailer';
import DeliveryLog from '../models/DeliveryLog.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { Employee, Freelancer, Vendor } from '../models/People.js';
import { getCommunicationConfig } from '../config/communications.js';

function emailTransport(config) {
  if (!config.enabled || !config.host || !config.user || !config.password) return null;
  return nodemailer.createTransport({
    host: config.host,
    port: Number(config.port || 587),
    secure: Boolean(config.secure),
    pool: true,
    auth: { user: config.user, pass: config.password }
  });
}

function whatsappNumber(phone, countryCode) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `${countryCode || '91'}${digits}`;
  return digits;
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
    const info = await transport.sendMail({
      from: config.from || config.user,
      to: destination,
      subject: `New project assigned: ${project.name}`,
      text: `Hello ${recipient.name},\n\nA new project is available in Trimurya Enterprise CRM.\n\nProject: ${project.name}\nCode: ${project.code}\nClient: ${project.clientName}\nDeadline: ${deadline}\nPriority: ${project.priority}\n\nPlease log in to the CRM to review the project.`,
      html: `<p>Hello <strong>${recipient.name}</strong>,</p><p>A new project is available in Trimurya Enterprise CRM.</p><table><tr><td>Project</td><td><strong>${project.name}</strong></td></tr><tr><td>Code</td><td>${project.code}</td></tr><tr><td>Client</td><td>${project.clientName}</td></tr><tr><td>Deadline</td><td>${deadline}</td></tr><tr><td>Priority</td><td>${project.priority}</td></tr></table><p>Please log in to the CRM to review the project.</p>`
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
