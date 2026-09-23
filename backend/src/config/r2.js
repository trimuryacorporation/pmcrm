import { GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import SystemSetting from '../models/SystemSetting.js';
import { decrypt } from '../utils/encryption.js';

export async function getR2Config() {
  const setting = await SystemSetting.findOne({ key: 'storage' }).lean();
  if (setting?.storage?.accountId && setting.storage.accessKeyIdEncrypted && setting.storage.secretAccessKeyEncrypted && setting.storage.bucket) {
    return {
      accountId: setting.storage.accountId,
      accessKeyId: decrypt(setting.storage.accessKeyIdEncrypted),
      secretAccessKey: decrypt(setting.storage.secretAccessKeyEncrypted),
      bucket: setting.storage.bucket
    };
  }
  const config = {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET
  };
  const missing = Object.entries(config).filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) throw new Error(`Cloudflare R2 is not configured. Open CRM Settings and add: ${missing.join(', ')}`);
  return config;
}

function r2Client(config) {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
  });
}

export async function putR2Object({ key, body, contentType, metadata }) {
  const config = await getR2Config();
  return r2Client(config).send(new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: body, ContentType: contentType, Metadata: metadata }));
}

export async function getR2Object(key) {
  const config = await getR2Config();
  return r2Client(config).send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
}

export async function testR2Config(config) {
  await r2Client(config).send(new HeadBucketCommand({ Bucket: config.bucket }));
}
