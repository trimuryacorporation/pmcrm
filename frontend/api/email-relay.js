import nodemailer from 'nodemailer';

const allowedHost = 'host10.cloudindianserver.com';
const allowedDomain = 'trimuryacorporation.in';

function address(value) {
  const match = String(value || '').match(/<([^>]+)>/);
  return (match?.[1] || String(value || '')).trim().toLowerCase();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { smtp = {}, message = {} } = req.body || {};
    const user = address(smtp.user);
    const from = address(message.from);
    const to = address(message.to);
    const validAccount = smtp.host === allowedHost
      && user.endsWith(`@${allowedDomain}`)
      && from.endsWith(`@${allowedDomain}`)
      && smtp.password
      && [465, 587].includes(Number(smtp.port));
    const validMessage = to.includes('@')
      && String(message.subject || '').length <= 200
      && String(message.text || '').length <= 20000
      && String(message.html || '').length <= 50000;

    if (!validAccount || !validMessage) return res.status(400).json({ message: 'Invalid email relay request' });

    const client = nodemailer.createTransport({
      host: allowedHost,
      port: Number(smtp.port),
      secure: Boolean(smtp.secure),
      auth: { user, pass: smtp.password },
      connectionTimeout: 12000,
      greetingTimeout: 10000,
      socketTimeout: 20000
    });
    const info = await client.sendMail({ from: message.from, to, subject: message.subject, text: message.text, html: message.html });
    client.close();
    return res.status(200).json({ ok: true, messageId: info.messageId });
  } catch (error) {
    return res.status(502).json({ message: `Email delivery failed: ${error.message}` });
  }
}
