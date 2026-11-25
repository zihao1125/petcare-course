import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { all } from '../db/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');
export const FORUM_UPLOAD_ROOT = path.join(UPLOAD_ROOT, 'forum');

export function petUploadDir(petId) {
  const dir = path.join(UPLOAD_ROOT, 'pets', String(petId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function publicUrl(petId, fileName) {
  return `/uploads/pets/${petId}/${fileName}`;
}

export function filePathFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const parts = url.split('/').filter(Boolean);
  if (parts.length < 4 || parts[0] !== 'uploads' || parts[1] !== 'pets') return null;
  const petId = Number(parts[2]);
  const name = path.basename(parts[3]);
  if (!Number.isInteger(petId)) return null;
  return path.join(UPLOAD_ROOT, 'pets', String(petId), name);
}

export function removeFileByUrl(url) {
  const full = filePathFromUrl(url);
  if (!full) return;
  try {
    fs.rmSync(full, { force: true });
  } catch (err) {
    console.warn('[warn] 删除文件失败', full, err.message);
  }
}

export function removePetFiles(petId) {
  const dir = path.join(UPLOAD_ROOT, 'pets', String(petId));
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (err) {
    console.warn('[warn] 删除宠物图片目录失败', dir, err.message);
  }
}

export function forumUploadDir() {
  fs.mkdirSync(FORUM_UPLOAD_ROOT, { recursive: true });
  return FORUM_UPLOAD_ROOT;
}

export function forumFileUrl(fileName) {
  return `/uploads/forum/${fileName}`;
}

export function forumFilePathFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const parts = url.split('/').filter(Boolean);
  if (parts.length !== 3 || parts[0] !== 'uploads' || parts[1] !== 'forum') return null;
  return path.join(FORUM_UPLOAD_ROOT, path.basename(parts[2]));
}

export function removeForumFileByUrl(url) {
  const full = forumFilePathFromUrl(url);
  if (!full) return;
  try {
    fs.rmSync(full, { force: true });
  } catch (err) {
    console.warn('[warn] 删除论坛附件失败', full, err.message);
  }
}

export function removeUserForumFiles(userId) {
  let files = [];
  try {
    files = all(
      `SELECT a.file_path FROM forum_attachments a
         JOIN forum_posts p ON p.id = a.post_id
        WHERE p.user_id = ?`,
      [userId]
    );
  } catch (err) {
    console.warn('[warn] 查询用户论坛附件失败', err.message);
    return;
  }
  for (const file of files) removeForumFileByUrl(file.file_path);
}
