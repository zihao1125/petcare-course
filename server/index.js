import express from 'express';
import cookieParser from 'cookie-parser';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './env.js';
import { ensureDatabase } from './db/init.js';
import { get } from './db/index.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, HttpError } from './utils/http.js';
import { UPLOAD_ROOT } from './utils/files.js';
import authRoutes from './routes/auth.js';
import petRoutes from './routes/pets.js';
import recordRoutes from './routes/records.js';
import adminRoutes from './routes/admin.js';
import forumRoutes from './routes/forum.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

ensureDatabase();

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pets/:petId(\\d+)', recordRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/forum', forumRoutes);

app.get('/uploads/pets/:petId/:file', requireAuth, (req, res, next) => {
  const pet = get('SELECT * FROM pets WHERE id = ?', [Number(req.params.petId)]);
  if (!pet) return next(new HttpError(404, '文件不存在'));
  if (req.user.role !== 'admin' && pet.user_id !== req.user.id) {
    return next(new HttpError(404, '文件不存在'));
  }
  const fileName = path.basename(req.params.file);
  const fullPath = path.join(UPLOAD_ROOT, 'pets', String(pet.id), fileName);
  if (!fs.existsSync(fullPath)) return next(new HttpError(404, '文件不存在'));
  if (req.query.download === '1') {
    return res.download(fullPath, fileName);
  }
  res.sendFile(fullPath);
});

app.get('/uploads/forum/:file', requireAuth, (req, res, next) => {
  const fileName = path.basename(req.params.file);
  const fullPath = path.join(UPLOAD_ROOT, 'forum', fileName);
  if (!fs.existsSync(fullPath)) return next(new HttpError(404, '文件不存在'));
  const ext = path.extname(fileName).toLowerCase();
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const inline = ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.webm'].includes(ext);
  if (!inline || req.query.download === '1') {
    const downloadName = path.basename(String(req.query.name || fileName)).slice(0, 150);
    return res.download(fullPath, downloadName);
  }
  res.sendFile(fullPath);
});

app.use('/uploads', (req, res) => res.status(404).json({ message: '文件不存在' }));

app.use('/api', (req, res) => res.status(404).json({ message: '接口不存在' }));

const distDir = path.resolve(__dirname, '../dist');
const distIndex = path.join(distDir, 'index.html');
if (fs.existsSync(distIndex)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(distIndex);
  });
}

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`宠知微服务已启动：http://localhost:${config.port}`);
});
