import express from 'express';
import bcrypt from 'bcryptjs';
import { all, get, run } from '../db/index.js';
import { HttpError } from '../utils/http.js';
import { text } from '../utils/validate.js';
import {
  securityQuestionLabel,
  normalizeAnswer,
  validateSecurityQuestionSet
} from '../utils/security.js';
import { requireAuth, setAuthCookie, clearAuthCookie, publicUser } from '../middleware/auth.js';
import { removePetFiles } from '../utils/files.js';

const router = express.Router();
const ACCOUNT_RE = /^[A-Za-z0-9_\u4e00-\u9fa5]{3,20}$/;
const USERNAME_RE = /^[\u4e00-\u9fa5A-Za-z0-9_\- ]{1,20}$/;

const RESET_WINDOW = 10 * 60 * 1000;
const RESET_MAX_FAILURES = 5;
const resetAttempts = new Map();

function isResetBlocked(account) {
  const record = resetAttempts.get(account);
  if (!record) return false;
  if (Date.now() - record.firstAt > RESET_WINDOW) {
    resetAttempts.delete(account);
    return false;
  }
  return record.count >= RESET_MAX_FAILURES;
}

function recordResetFailure(account) {
  const now = Date.now();
  const record = resetAttempts.get(account);
  if (!record || now - record.firstAt > RESET_WINDOW) {
    resetAttempts.set(account, { count: 1, firstAt: now });
  } else {
    record.count += 1;
  }
}

function clearResetFailures(account) {
  resetAttempts.delete(account);
}

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
  const account = text(body.account);
  if (!ACCOUNT_RE.test(account)) {
    throw new HttpError(400, '账号需为 3-20 位字母、数字、下划线或中文');
  }
  const username = text(body.username);
  if (!USERNAME_RE.test(username)) {
    throw new HttpError(400, '用户名为 1-20 位中文、字母、数字、空格、下划线或短横线');
  }
  const password = readPassword(body.password);
  const securityQuestions = validateSecurityQuestionSet(body.securityQuestions);

  if (get('SELECT id FROM users WHERE account = ?', [account])) {
    throw new HttpError(409, '该账号已被注册');
  }
  if (get('SELECT id FROM users WHERE username = ?', [username])) {
    throw new HttpError(409, '该用户名已被使用');
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = run("INSERT INTO users (account, username, password_hash, role) VALUES (?, ?, ?, 'user')", [
    account,
    username,
    hash
  ]);
  const userId = result.lastInsertRowid;
  try {
    for (const question of securityQuestions) {
      run(
        'INSERT INTO user_security_answers (user_id, question_key, answer_hash, position) VALUES (?, ?, ?, ?)',
        [userId, question.key, bcrypt.hashSync(question.answer, 10), question.position]
      );
    }
  } catch (err) {
    run('DELETE FROM users WHERE id = ?', [userId]);
    throw err;
  }

  const user = get(
    'SELECT id, account, username, role, status, profile_completed, created_at FROM users WHERE id = ?',
    [userId]
  );
  setAuthCookie(res, user);
  res.status(201).json({ user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const body = req.body || {};
  const account = text(body.account);
  const password = text(body.password);
  const role = body.role === 'admin' ? 'admin' : 'user';
  if (!account || !password) throw new HttpError(400, '请输入账号和密码');

  const user = get('SELECT * FROM users WHERE account = ?', [account]);
  if (!user || !bcrypt.compareSync(password, user.password_hash) || user.role !== role) {
    throw new HttpError(401, '账号或密码错误');
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

function questionRowsFor(userId) {
  return all(
    'SELECT question_key, position FROM user_security_answers WHERE user_id = ? ORDER BY position, id',
    [userId]
  ).map((row) => ({
    key: row.question_key,
    label: securityQuestionLabel(row.question_key)
  }));
}

router.get('/security-questions/me', requireAuth, (req, res) => {
  res.json({ questions: questionRowsFor(req.user.id) });
});

router.put('/security-questions/me', requireAuth, (req, res) => {
  const body = req.body || {};
  const password = text(body.password);
  const user = get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new HttpError(400, '密码不正确');
  }
  const questions = validateSecurityQuestionSet(body.questions);
  run('DELETE FROM user_security_answers WHERE user_id = ?', [user.id]);
  for (const question of questions) {
    run(
      'INSERT INTO user_security_answers (user_id, question_key, answer_hash, position) VALUES (?, ?, ?, ?)',
      [user.id, question.key, bcrypt.hashSync(question.answer, 10), question.position]
    );
  }
  res.json({
    questions: questions.map((question) => ({
      key: question.key,
      label: securityQuestionLabel(question.key)
    }))
  });
});

router.post('/security-questions', (req, res) => {
  const account = text((req.body || {}).account);
  if (!account) throw new HttpError(400, '请输入账号');
  const user = get("SELECT id, status FROM users WHERE account = ? AND role = 'user'", [account]);
  if (!user || user.status !== 'active') {
    throw new HttpError(400, '账号不存在或未设置密保问题');
  }
  const questions = questionRowsFor(user.id);
  if (questions.length !== 3) {
    throw new HttpError(400, '账号不存在或未设置密保问题');
  }
  res.json({ questions });
});

router.post('/reset-password', (req, res) => {
  const body = req.body || {};
  const account = text(body.account);
  if (!account) throw new HttpError(400, '请输入账号');
  if (isResetBlocked(account)) {
    throw new HttpError(429, '尝试次数过多，请 10 分钟后再试');
  }

  const newPassword = readPassword(body.newPassword);
  const user = get("SELECT * FROM users WHERE account = ? AND role = 'user'", [account]);
  if (!user) {
    recordResetFailure(account);
    throw new HttpError(400, '账号或密保问题不正确');
  }

  const rows = all('SELECT * FROM user_security_answers WHERE user_id = ? ORDER BY position', [user.id]);
  if (rows.length !== 3) {
    recordResetFailure(account);
    throw new HttpError(400, '账号或密保问题不正确');
  }

  const answers = Array.isArray(body.answers) ? body.answers : [];
  const answerMap = new Map();
  for (const item of answers) {
    const key = String(item?.key || '');
    if (key) answerMap.set(key, normalizeAnswer(item?.answer));
  }

  let allCorrect = true;
  for (const row of rows) {
    const answer = answerMap.get(row.question_key);
    if (!answer || !bcrypt.compareSync(answer, row.answer_hash)) {
      allCorrect = false;
      break;
    }
  }
  if (!allCorrect) {
    recordResetFailure(account);
    throw new HttpError(400, '密保答案不正确');
  }

  clearResetFailures(account);
  if (bcrypt.compareSync(newPassword, user.password_hash)) {
    throw new HttpError(400, '新密码不能与原密码相同');
  }
  run('UPDATE users SET password_hash = ? WHERE id = ?', [bcrypt.hashSync(newPassword, 10), user.id]);
  res.json({ ok: true });
});

router.post('/complete-profile', requireAuth, (req, res) => {
  if (req.user.role !== 'user') throw new HttpError(403, '管理员无需完善此信息');
  const body = req.body || {};
  const account = text(body.account);
  if (!ACCOUNT_RE.test(account)) {
    throw new HttpError(400, '账号需为 3-20 位字母、数字、下划线或中文');
  }
  const questions = validateSecurityQuestionSet(body.securityQuestions);
  const conflict = get('SELECT id FROM users WHERE account = ? AND id <> ?', [account, req.user.id]);
  if (conflict) throw new HttpError(409, '该账号已被注册');

  run('UPDATE users SET account = ?, profile_completed = 1 WHERE id = ?', [account, req.user.id]);
  run('DELETE FROM user_security_answers WHERE user_id = ?', [req.user.id]);
  for (const question of questions) {
    run(
      'INSERT INTO user_security_answers (user_id, question_key, answer_hash, position) VALUES (?, ?, ?, ?)',
      [req.user.id, question.key, bcrypt.hashSync(question.answer, 10), question.position]
    );
  }
  const user = get(
    'SELECT id, account, username, role, status, profile_completed, created_at FROM users WHERE id = ?',
    [req.user.id]
  );
  res.json({ user: publicUser(user) });
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
    user: { account: req.user.account, username: req.user.username, created_at: req.user.created_at },
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
