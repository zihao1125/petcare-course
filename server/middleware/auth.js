import jwt from 'jsonwebtoken';
import { get } from '../db/index.js';
import { config } from '../env.js';
import { HttpError } from '../utils/http.js';

export function setAuthCookie(res, user) {
  const token = jwt.sign({ uid: user.id, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: config.cookieMaxAge,
    path: '/'
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(config.cookieName, { path: '/' });
}

export function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    status: user.status,
    created_at: user.created_at
  };
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.[config.cookieName];
  if (!token) return next(new HttpError(401, '请先登录'));
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return next(new HttpError(401, '登录已过期，请重新登录'));
  }
  const user = get('SELECT id, username, role, status, created_at FROM users WHERE id = ?', [payload.uid]);
  if (!user) return next(new HttpError(401, '账号不存在'));
  if (user.status !== 'active') return next(new HttpError(403, '账号已被禁用'));
  req.user = user;
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return next(new HttpError(401, '请先登录'));
    if (req.user.role !== role) return next(new HttpError(403, '没有权限执行该操作'));
    next();
  };
}

export function loadPet(req, res, next) {
  const petId = Number(req.params.petId);
  if (!Number.isInteger(petId)) return next(new HttpError(404, '宠物不存在'));
  const pet = get('SELECT * FROM pets WHERE id = ?', [petId]);
  if (!pet) return next(new HttpError(404, '宠物不存在'));
  if (req.user.role !== 'admin' && pet.user_id !== req.user.id) {
    return next(new HttpError(404, '宠物不存在'));
  }
  req.pet = pet;
  next();
}
