import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import { HttpError } from '../utils/http.js';
import { petUploadDir } from '../utils/files.js';

const ALLOWED = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp']
]);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const petId = req.pet?.id || Number(req.params.petId);
    if (!petId) return cb(new HttpError(400, '宠物参数不正确'));
    try {
      cb(null, petUploadDir(petId));
    } catch (err) {
      cb(err);
    }
  },
  filename(req, file, cb) {
    const ext = ALLOWED.get(file.mimetype) || path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  }
});

export const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    if (!ALLOWED.has(file.mimetype)) {
      return cb(new HttpError(400, '仅支持 JPG、PNG、WEBP 格式的图片'));
    }
    cb(null, true);
  }
});

export const uploadImages = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter(req, file, cb) {
    if (!ALLOWED.has(file.mimetype)) {
      return cb(new HttpError(400, '仅支持 JPG、PNG、WEBP 格式的图片'));
    }
    cb(null, true);
  }
});
