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
