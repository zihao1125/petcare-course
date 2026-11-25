export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function fail(status, message) {
  throw new HttpError(status, message);
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    const message = req.originalUrl.startsWith('/api/forum')
      ? '单个附件不能超过 50MB'
      : '图片大小不能超过 5MB';
    return res.status(413).json({ message });
  }
  if (err && err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ message: '一次最多上传 6 个附件' });
  }
  if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ message: '上传字段不正确' });
  }
  console.error('[error]', err);
  return res.status(500).json({ message: '服务器内部错误' });
}
