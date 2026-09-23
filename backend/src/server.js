import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { errorHandler, notFound } from './middleware/error.js';
import apiRoutes from './routes/index.js';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configuredOrigins = (process.env.CLIENT_URL || '').split(',');
const allowedOrigins = [
  'http://localhost:5173',
  'https://pmcrm-five.vercel.app',
  ...configuredOrigins
]
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter((origin, index, origins) => origin && origins.indexOf(origin) === index);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')));

const serviceStatus = (req, res) => res.json({
  ok: true,
  service: 'Trimurya Enterprise CRM API',
  environment: process.env.NODE_ENV || 'development',
  health: '/health',
  api: '/api'
});

app.get('/', serviceStatus);
app.get('/health', serviceStatus);
app.use('/api', apiRoutes);
app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5000;

connectDB()
  .then(() => app.listen(port, () => console.log(`API running on http://localhost:${port}`)))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
