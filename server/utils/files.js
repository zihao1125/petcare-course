import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');

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
