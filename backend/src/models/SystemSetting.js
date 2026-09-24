import mongoose from 'mongoose';

const systemSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    storage: {
      driver: { type: String, enum: ['r2'], default: 'r2' },
      accountId: String,
      accessKeyIdEncrypted: String,
      secretAccessKeyEncrypted: String,
      bucket: String,
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    communications: {
      email: {
        enabled: { type: Boolean, default: false },
        host: String,
        port: { type: Number, default: 587 },
        secure: { type: Boolean, default: false },
        user: String,
        passwordEncrypted: String,
        from: String
      },
      whatsapp: {
        enabled: { type: Boolean, default: false },
        apiVersion: { type: String, default: 'v23.0' },
        phoneNumberId: String,
        accessTokenEncrypted: String,
        templateName: { type: String, default: 'project_assignment' },
        templateLanguage: { type: String, default: 'en_US' },
        countryCode: { type: String, default: '91' }
      },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    portal: {
      url: String,
      companyName: String,
      contactPerson: String,
      email: String,
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }
  },
  { timestamps: true }
);

export default mongoose.model('SystemSetting', systemSettingSchema);
