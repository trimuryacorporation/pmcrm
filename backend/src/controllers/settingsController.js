import SystemSetting from '../models/SystemSetting.js';
import { testR2Config } from '../config/r2.js';
import { decrypt, encrypt } from '../utils/encryption.js';
import { writeAudit } from '../utils/audit.js';

async function mergedConfig(input) {
  const current = await SystemSetting.findOne({ key: 'storage' }).lean();
  let savedAccessKey = '';
  let savedSecretKey = '';
  try {
    savedAccessKey = current?.storage?.accessKeyIdEncrypted ? decrypt(current.storage.accessKeyIdEncrypted) : '';
    savedSecretKey = current?.storage?.secretAccessKeyEncrypted ? decrypt(current.storage.secretAccessKeyEncrypted) : '';
  } catch {
    // Saved values may belong to a previous SETTINGS_ENCRYPTION_KEY; fall back to deployment settings.
  }
  return {
    accountId: input.accountId || current?.storage?.accountId,
    accessKeyId: input.accessKeyId || savedAccessKey || process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: input.secretAccessKey || savedSecretKey || process.env.R2_SECRET_ACCESS_KEY || '',
    bucket: input.bucket || current?.storage?.bucket
  };
}

export async function getStorageSettings(req, res, next) {
  try {
    const setting = await SystemSetting.findOne({ key: 'storage' }).lean();
    res.json({
      driver: 'r2',
      accountId: setting?.storage?.accountId || process.env.R2_ACCOUNT_ID || '',
      bucket: setting?.storage?.bucket || process.env.R2_BUCKET || 'projectdocuments',
      accessKeyConfigured: Boolean(setting?.storage?.accessKeyIdEncrypted || process.env.R2_ACCESS_KEY_ID),
      secretKeyConfigured: Boolean(setting?.storage?.secretAccessKeyEncrypted || process.env.R2_SECRET_ACCESS_KEY),
      updatedAt: setting?.updatedAt
    });
  } catch (error) {
    next(error);
  }
}

export async function testStorageSettings(req, res, next) {
  try {
    const config = await mergedConfig(req.body);
    await testR2Config(config);
    res.json({ ok: true, message: `Connected to R2 bucket ${config.bucket}` });
  } catch (error) {
    res.status(400);
    next(new Error(`R2 connection failed: ${error.message}`));
  }
}

export async function updateStorageSettings(req, res, next) {
  try {
    const config = await mergedConfig(req.body);
    await testR2Config(config);
    const storage = {
      driver: 'r2',
      accountId: config.accountId,
      accessKeyIdEncrypted: encrypt(config.accessKeyId),
      secretAccessKeyEncrypted: encrypt(config.secretAccessKey),
      bucket: config.bucket,
      updatedBy: req.user._id
    };
    const setting = await SystemSetting.findOneAndUpdate({ key: 'storage' }, { key: 'storage', storage }, { upsert: true, new: true, runValidators: true });
    await writeAudit(req, 'UPDATE', 'StorageSettings', setting, { driver: 'r2', accountId: config.accountId, bucket: config.bucket });
    res.json({ ok: true, message: 'Cloudflare R2 settings saved and verified' });
  } catch (error) {
    res.status(400);
    next(new Error(`R2 settings were not saved: ${error.message}`));
  }
}
