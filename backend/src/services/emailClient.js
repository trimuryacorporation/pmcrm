import nodemailer from 'nodemailer';

function relayUrl() {
  if (process.env.EMAIL_RELAY_URL) return process.env.EMAIL_RELAY_URL.replace(/\/$/, '');
  const isRender = process.env.RENDER || process.env.RENDER_SERVICE_ID || process.env.RENDER_EXTERNAL_HOSTNAME;
  if (!isRender) return '';
  const frontend = process.env.APP_URL || (process.env.CLIENT_URL || '').split(',').map((value) => value.trim()).find((value) => value.startsWith('https://'));
  return frontend ? `${frontend.replace(/\/$/, '')}/api/email-relay` : '';
}

export function createEmailClient(config, options = {}) {
  const url = relayUrl();
  if (url) {
    return {
      async verify() {
        return true;
      },
      async sendMail(message) {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            smtp: {
              host: config.host,
              port: Number(config.port),
              secure: Boolean(config.secure),
              user: config.user,
              password: config.password
            },
            message
          }),
          signal: AbortSignal.timeout(25000)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || `Email relay failed (${response.status})`);
        return { messageId: data.messageId };
      },
      close() {}
    };
  }

  return nodemailer.createTransport({
    host: config.host,
    port: Number(config.port || 587),
    secure: Boolean(config.secure),
    pool: Boolean(options.pool),
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000
  });
}
