export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_REPORT_IMAGES = 6;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateImageFile(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return '仅支持 JPG、PNG、WEBP 格式的图片';
  if (file.size > MAX_IMAGE_SIZE) return '图片大小不能超过 5MB';
  return null;
}

export function validateImageFiles(files: File[], maxFiles = 1): string | null {
  if (files.length === 0) return '请选择要上传的图片';
  if (files.length > maxFiles) return `一次最多上传 ${maxFiles} 张图片`;
  for (const file of files) {
    const error = validateImageFile(file);
    if (error) return error;
  }
  return null;
}

export function fileListToArray(list: FileList | null): File[] {
  return list ? Array.from(list) : [];
}

/* ---------------- 论坛附件 ---------------- */

export type ForumFileKind = 'image' | 'video' | 'file';

export const MAX_FORUM_FILES = 6;
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
export const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024;
export const FORUM_ACCEPT =
  '.jpg,.jpeg,.png,.webp,.mp4,.webm,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
const VIDEO_EXTS = ['.mp4', '.webm'];
const DOCUMENT_EXTS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'];

export function forumFileKind(file: File): ForumFileKind | null {
  const name = file.name.toLowerCase();
  const ext = name.slice(name.lastIndexOf('.'));
  if (IMAGE_EXTS.includes(ext) || IMAGE_TYPES.includes(file.type)) return 'image';
  if (VIDEO_EXTS.includes(ext) || file.type === 'video/mp4' || file.type === 'video/webm') return 'video';
  if (DOCUMENT_EXTS.includes(ext)) return 'file';
  return null;
}

export function validateForumFile(file: File): string | null {
  const kind = forumFileKind(file);
  if (!kind) return '仅支持 JPG/PNG/WEBP 图片、MP4/WEBM 视频及 PDF/Word/Excel/PPT/TXT 文档';
  if (kind === 'image' && file.size > MAX_IMAGE_SIZE) return '图片大小不能超过 5MB';
  if (kind === 'video' && file.size > MAX_VIDEO_SIZE) return '视频大小不能超过 50MB';
  if (kind === 'file' && file.size > MAX_DOCUMENT_SIZE) return '文档大小不能超过 20MB';
  return null;
}
