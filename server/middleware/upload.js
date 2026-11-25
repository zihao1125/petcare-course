import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import { HttpError } from '../utils/http.js';
import { petUploadDir, forumUploadDir } from '../utils/files.js';

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

/* ---------------- 论坛附件 ---------------- */

export const FORUM_MAX_FILES = 6;
export const FORUM_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
export const FORUM_VIDEO_MAX_SIZE = 50 * 1024 * 1024;
export const FORUM_DOC_MAX_SIZE = 20 * 1024 * 1024;

const FORUM_KIND_BY_EXT = new Map([
  ['.jpg', 'image'],
  ['.jpeg', 'image'],
  ['.png', 'image'],
  ['.webp', 'image'],
  ['.mp4', 'video'],
  ['.webm', 'video'],
  ['.pdf', 'file'],
  ['.doc', 'file'],
  ['.docx', 'file'],
  ['.xls', 'file'],
  ['.xlsx', 'file'],
  ['.ppt', 'file'],
  ['.pptx', 'file'],
  ['.txt', 'file']
]);

export const FORUM_FILE_HINT =
  '支持 JPG/PNG/WEBP 图片、MP4/WEBM 视频及 PDF/Word/Excel/PPT/TXT 文档';

export function forumFileKind(originalName) {
  return FORUM_KIND_BY_EXT.get(path.extname(originalName || '').toLowerCase()) || null;
}

export function forumFileSizeLimit(kind) {
  if (kind === 'image') return FORUM_IMAGE_MAX_SIZE;
  if (kind === 'video') return FORUM_VIDEO_MAX_SIZE;
  return FORUM_DOC_MAX_SIZE;
}

const forumStorage = multer.diskStorage({
  destination(req, file, cb) {
    try {
      cb(null, forumUploadDir());
    } catch (err) {
      cb(err);
    }
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  }
});

export const uploadForumFiles = multer({
  storage: forumStorage,
  limits: { fileSize: FORUM_VIDEO_MAX_SIZE, files: FORUM_MAX_FILES },
  fileFilter(req, file, cb) {
    if (!forumFileKind(file.originalname)) {
      return cb(new HttpError(400, `附件格式不支持，${FORUM_FILE_HINT}`));
    }
    cb(null, true);
  }
});
