import SystemSetting from '../models/SystemSetting.js';
import { decrypt } from '../utils/encryption.js';

function emailPassword(saved) {
  if (!saved?.email?.passwordEncrypted) return process.env.SMTP_PASS || '';
  try {
    return decrypt(saved.email.passwordEncrypted);
  } catch {
    return process.env.SMTP_PASS || '';
  }
}

export async function getCommunicationConfig() {
  const setting = await SystemSetting.findOne({ key: 'communications' }).lean();
  const saved = setting?.communications;
  return {
    email: {
      enabled: saved ? saved.email?.enabled : Boolean(process.env.SMTP_HOST),
      host: saved?.email?.host || process.env.SMTP_HOST || '',
      port: Number(saved?.email?.port || process.env.SMTP_PORT || 587),
      secure: saved ? Boolean(saved.email?.secure) : String(process.env.SMTP_SECURE).toLowerCase() === 'true',
      user: saved?.email?.user || process.env.SMTP_USER || '',
      password: emailPassword(saved),
      from: saved?.email?.from || process.env.SMTP_FROM || process.env.SMTP_USER || ''
    },
    whatsapp: {
      enabled: saved ? saved.whatsapp?.enabled : Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID),
      apiVersion: saved?.whatsapp?.apiVersion || process.env.WHATSAPP_API_VERSION || 'v23.0',
      phoneNumberId: saved?.whatsapp?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      accessToken: saved?.whatsapp?.accessTokenEncrypted ? decrypt(saved.whatsapp.accessTokenEncrypted) : process.env.WHATSAPP_ACCESS_TOKEN || '',
      templateName: saved?.whatsapp?.templateName || process.env.WHATSAPP_TEMPLATE_NAME || 'project_assignment',
      templateLanguage: saved?.whatsapp?.templateLanguage || process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US',
      countryCode: saved?.whatsapp?.countryCode || process.env.DEFAULT_PHONE_COUNTRY_CODE || '91'
    }
  };
}
