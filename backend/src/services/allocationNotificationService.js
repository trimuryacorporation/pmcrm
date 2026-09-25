import DeliveryLog from '../models/DeliveryLog.js';
import { getCommunicationConfig } from '../config/communications.js';
import { createEmailClient } from './emailClient.js';

function frontendUrl() {
  const configured = process.env.APP_URL || (process.env.CLIENT_URL || '').split(',').map((value) => value.trim()).find(Boolean);
  return (configured || 'http://localhost:5173').replace(/\/$/, '');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[character]));
}

function recipientFor(allocation) {
  if (allocation.personType === 'Employee' && allocation.employee) return { person: allocation.employee, name: allocation.employee.name, email: allocation.employee.email };
  if (allocation.personType === 'Vendor' && allocation.vendor) return { person: allocation.vendor, name: allocation.vendor.contactPerson || allocation.vendor.agencyName, email: allocation.vendor.email };
  if (allocation.personType === 'Freelancer' && allocation.freelancer) return { person: allocation.freelancer, name: allocation.freelancer.name, email: allocation.freelancer.email };
  if (allocation.personType === 'Candidate' && allocation.candidate) return { person: allocation.candidate, name: allocation.candidate.fullName, email: allocation.candidate.email };
  return null;
}

export async function notifyAllocationCreated(allocation) {
  const recipient = recipientFor(allocation);
  const project = allocation.project;
  if (!recipient || !project) return { status: 'skipped', reason: 'Allocation recipient or project is missing' };

  const config = (await getCommunicationConfig()).email;
  const configured = config.enabled && config.host && config.user && config.password && config.from;
  const log = await DeliveryLog.create({
    project: project._id,
    recipientType: allocation.personType,
    recipientId: recipient.person._id,
    recipientName: recipient.name,
    channel: 'email',
    destination: recipient.email,
    status: recipient.email && configured ? 'queued' : 'skipped'
  });
  if (!recipient.email || !configured) return { status: 'skipped', reason: !recipient.email ? 'Recipient email is missing' : 'SMTP email settings are not configured or enabled' };

  const languages = allocation.languages?.length ? allocation.languages.join(', ') : 'Not specified';
  const teamCounts = allocation.languageTeamCounts?.length ? allocation.languageTeamCounts.map((item) => `${item.language}: ${item.teamCount}`).join(', ') : 'Not specified';
  const loginUrl = `${frontendUrl()}/login`;
  const details = [
    ['Project', project.name],
    ['Project code', project.code || '-'],
    ['Role', allocation.role],
    ['Work status', allocation.workStatus],
    ['Languages', languages],
    ['Team count', teamCounts]
  ];
  const detailRows = details.map(([label, value]) => `<tr>
    <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;vertical-align:top;width:36%">${escapeHtml(label)}</td>
    <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top">${escapeHtml(value)}</td>
  </tr>`).join('');
  const transport = createEmailClient(config);
  try {
    const info = await transport.sendMail({
      from: config.from,
      to: recipient.email,
      subject: `New allocation: ${project.name}`,
      text: `Hello ${recipient.name},\n\nYou have been allocated to a project in Trimurya Enterprise CRM.\n\nProject: ${project.name}\nProject code: ${project.code || '-'}\nRole: ${allocation.role}\nWork status: ${allocation.workStatus}\nLanguages: ${languages}\nLanguage-wise team count: ${teamCounts}\n\nOpen CRM: ${loginUrl}`,
      html: `<div style="margin:0;padding:32px 16px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;margin:0 auto;border-collapse:separate">
          <tr><td style="padding:28px 32px;background:#1e1b4b;border-radius:16px 16px 0 0;color:#ffffff">
            <div style="font-size:12px;font-weight:700;letter-spacing:1.4px;color:#c7d2fe;text-transform:uppercase">Trimurya Enterprise CRM</div>
            <div style="margin-top:10px;font-size:26px;line-height:32px;font-weight:700">New project allocation</div>
            <div style="margin-top:8px;font-size:14px;line-height:21px;color:#e0e7ff">A project has been assigned to you.</div>
          </td></tr>
          <tr><td style="padding:30px 32px;background:#ffffff">
            <p style="margin:0 0 12px;font-size:16px;line-height:24px;color:#0f172a">Hello <strong>${escapeHtml(recipient.name)},</strong></p>
            <p style="margin:0 0 24px;font-size:14px;line-height:22px;color:#475569">You have been allocated to a project. The allocation details are below.</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e8f0;border-radius:10px;border-collapse:separate;overflow:hidden">${detailRows}</table>
            <div style="padding-top:28px;text-align:center"><a href="${escapeHtml(loginUrl)}" style="display:inline-block;padding:12px 22px;background:#4f46e5;border-radius:8px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">Open CRM</a></div>
          </td></tr>
          <tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 16px 16px;text-align:center;color:#64748b;font-size:12px;line-height:18px">This is an automated notification from Trimurya Enterprise CRM.</td></tr>
        </table>
      </div>`
    });
    await DeliveryLog.findByIdAndUpdate(log._id, { status: 'sent', sentAt: new Date(), providerMessageId: info.messageId });
    return { status: 'sent' };
  } catch (error) {
    await DeliveryLog.findByIdAndUpdate(log._id, { status: 'failed', error: error.message });
    return { status: 'failed', reason: error.message };
  } finally {
    transport.close();
  }
}
