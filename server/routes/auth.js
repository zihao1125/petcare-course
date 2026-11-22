import express from 'express';
import bcrypt from 'bcryptjs';
import { all, get, run } from '../db/index.js';
import { HttpError } from '../utils/http.js';
import { text } from '../utils/validate.js';
import { requireAuth, setAuthCookie, clearAuthCookie, publicUser } from '../middleware/auth.js';
import { removePetFiles } from '../utils/files.js';

const router = express.Router();
const USERNAME_RE = /^[A-Za-z0-9_\u4e00-\u9fa5]{3,20}$/;

function readPassword(value) {
  const pwd = text(value);
  if (pwd.length < 6) throw new HttpError(400, '密码长度至少为 6 位');
  if (pwd.length > 64) throw new HttpError(400, '密码不能超过 64 位');
  return pwd;
}

function collectPetRecords(petId) {
  return {
    weights: all('SELECT * FROM weight_records WHERE pet_id = ? ORDER BY record_date DESC, id DESC', [petId]),
    health: all('SELECT * FROM health_records WHERE pet_id = ? ORDER BY record_date DESC, id DESC', [petId]),
    medications: all('SELECT * FROM medications WHERE pet_id = ? ORDER BY id DESC', [petId]),
    visits: all('SELECT * FROM vet_visits WHERE pet_id = ? ORDER BY visit_date DESC, id DESC', [petId]).map((v) => ({
      ...v,
      images: all('SELECT id, file_path FROM vet_visit_images WHERE visit_id = ? ORDER BY id', [v.id])
    })),
    vaccinations: all('SELECT * FROM vaccinations WHERE pet_id = ? ORDER BY date DESC, id DESC', [petId]),
    dewormings: all('SELECT * FROM dewormings WHERE pet_id = ? ORDER BY date DESC, id DESC', [petId]),
    photos: all('SELECT * FROM pet_photos WHERE pet_id = ? ORDER BY id DESC', [petId])
  };
}

router.post('/register', (req, res) => {
  const body = req.body || {};
  const username = text(body.username);
  if (!USERNAME_RE.test(username)) {
    throw new HttpError(400, '用户名需为 3-20 位字母、数字、下划线或中文');
  }
  const password = readPassword(body.password);
  const exists = get('SELECT id FROM users WHERE username = ?', [username]);
  if (exists) throw new HttpError(409, '该用户名已被注册');

  const hash = bcrypt.hashSync(password, 10);
  const result = run("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'user')", [username, hash]);
  const user = get('SELECT id, username, role, status, created_at FROM users WHERE id = ?', [result.lastInsertRowid]);
  setAuthCookie(res, user);
  res.status(201).json({ user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const body = req.body || {};
  const username = text(body.username);
  const password = text(body.password);
  const role = body.role === 'admin' ? 'admin' : 'user';
  if (!username || !password) throw new HttpError(400, '请输入用户名和密码');

  const user = get('SELECT * FROM users WHERE username = ?', [username]);
  if (!user || !bcrypt.compareSync(password, user.password_hash) || user.role !== role) {
    throw new HttpError(401, '用户名或密码错误');
  }
  if (user.status !== 'active') throw new HttpError(403, '该账号已被禁用，请联系管理员');
  setAuthCookie(res, user);
  res.json({ user: publicUser(user) });
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.post('/change-password', requireAuth, (req, res) => {
  const body = req.body || {};
  const oldPassword = text(body.oldPassword);
  const newPassword = readPassword(body.newPassword);
  const user = get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
    throw new HttpError(400, '原密码不正确');
  }
  if (oldPassword === newPassword) throw new HttpError(400, '新密码不能与原密码相同');
  run('UPDATE users SET password_hash = ? WHERE id = ?', [bcrypt.hashSync(newPassword, 10), user.id]);
  res.json({ ok: true });
});

router.get('/export', requireAuth, (req, res) => {
  if (req.user.role !== 'user') throw new HttpError(403, '管理员无个人数据可导出');
  const pets = all('SELECT * FROM pets WHERE user_id = ? ORDER BY id', [req.user.id]);
  const payload = {
    exported_at: new Date().toISOString(),
    user: { username: req.user.username, created_at: req.user.created_at },
    pets: pets.map((pet) => ({ ...pet, records: collectPetRecords(pet.id) }))
  };
  const safeName = req.user.username.replace(/[^A-Za-z0-9_-]/g, '') || 'user';
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="petcare-export-${safeName}.json"`);
  res.send(JSON.stringify(payload, null, 2));
});

router.post('/delete-account', requireAuth, (req, res) => {
  if (req.user.role !== 'user') throw new HttpError(403, '管理员账号不能在此注销');
  const password = text((req.body || {}).password);
  const user = get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!bcrypt.compareSync(password, user.password_hash)) {
    throw new HttpError(400, '密码不正确，无法注销');
  }
  const pets = all('SELECT id FROM pets WHERE user_id = ?', [user.id]);
  for (const pet of pets) removePetFiles(pet.id);
  run('DELETE FROM users WHERE id = ?', [user.id]);
  clearAuthCookie(res);
  res.json({ ok: true });
});

export default router;
