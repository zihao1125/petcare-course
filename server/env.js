import 'dotenv/config';
import crypto from 'node:crypto';

const fallbackSecret = crypto.randomBytes(32).toString('hex');

export const config = {
  port: Number(process.env.PORT || 3001),
  jwtSecret: process.env.JWT_SECRET || fallbackSecret,
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  cookieName: 'petcare_token',
  cookieMaxAge: 7 * 24 * 60 * 60 * 1000,
  isProd: process.env.NODE_ENV === 'production'
};

if (!process.env.JWT_SECRET) {
  console.warn('[warn] 未设置 JWT_SECRET，已使用随机值，重启后所有登录状态会失效');
}
