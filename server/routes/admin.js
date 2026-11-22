import express from 'express';
import bcrypt from 'bcryptjs';
import { all, get, run } from '../db/index.js';
import { HttpError } from '../utils/http.js';
import { text } from '../utils/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { removePetFiles } from '../utils/files.js';

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

function findUser(id) {
  const user = get("SELECT id, username, role, status, created_at FROM users WHERE id = ? AND role = 'user'", [id]);
  if (!user) throw new HttpError(404, '用户不存在');
  return user;
}

function petRecords(petId) {
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

router.get('/overview', (req, res) => {
  const stats = get(
    `SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'user') AS users,
      (SELECT COUNT(*) FROM pets) AS pets,
      (SELECT COUNT(*) FROM pets WHERE user_id IN (SELECT id FROM users WHERE role = 'user')) AS active_pets,
      (
        (SELECT COUNT(*) FROM weight_records) +
        (SELECT COUNT(*) FROM health_records) +
        (SELECT COUNT(*) FROM medications) +
        (SELECT COUNT(*) FROM vet_visits) +
        (SELECT COUNT(*) FROM vaccinations) +
        (SELECT COUNT(*) FROM dewormings) +
        (SELECT COUNT(*) FROM pet_photos)
      ) AS records,
      (
        (SELECT COUNT(*) FROM vaccinations WHERE next_due_date IS NOT NULL AND date(next_due_date) <= date('now', 'localtime', '+7 day')) +
        (SELECT COUNT(*) FROM dewormings WHERE next_due_date IS NOT NULL AND date(next_due_date) <= date('now', 'localtime', '+7 day')) +
        (SELECT COUNT(*) FROM vet_visits WHERE followup_date IS NOT NULL AND date(followup_date) <= date('now', 'localtime', '+7 day'))
      ) AS due_soon`
  );
  res.json({ stats });
});

router.get('/users', (req, res) => {
  const q = text(req.query.q);
  const like = `%${q}%`;
  const users = all(
    `SELECT u.id, u.username, u.status, u.created_at,
       (SELECT COUNT(*) FROM pets p WHERE p.user_id = u.id) AS pet_count,
       (SELECT COUNT(*) FROM users) AS _ignored
     FROM users u
     WHERE u.role = 'user' AND (? = '' OR u.username LIKE ?)
     ORDER BY u.id DESC`,
    [q, like]
  );
  res.json({ users: users.map(({ _ignored, ...u }) => u) });
});

router.get('/users/:id', (req, res) => {
  const user = findUser(Number(req.params.id));
  const pets = all('SELECT * FROM pets WHERE user_id = ? ORDER BY id DESC', [user.id]);
  res.json({
    user,
    pets: pets.map((pet) => ({ ...pet, records: petRecords(pet.id) }))
  });
});

router.patch('/users/:id/status', (req, res) => {
  const user = findUser(Number(req.params.id));
  const status = (req.body || {}).status;
  if (!['active', 'disabled'].includes(status)) throw new HttpError(400, '状态取值不合法');
  run('UPDATE users SET status = ? WHERE id = ?', [status, user.id]);
  res.json({ user: { ...user, status } });
});

router.post('/users/:id/reset-password', (req, res) => {
  const user = findUser(Number(req.params.id));
  const password = text((req.body || {}).newPassword);
  if (password.length < 6) throw new HttpError(400, '新密码长度至少为 6 位');
  if (password.length > 64) throw new HttpError(400, '新密码不能超过 64 位');
  run('UPDATE users SET password_hash = ? WHERE id = ?', [bcrypt.hashSync(password, 10), user.id]);
  res.json({ ok: true });
});

router.delete('/users/:id', (req, res) => {
  const user = findUser(Number(req.params.id));
  const pets = all('SELECT id FROM pets WHERE user_id = ?', [user.id]);
  for (const pet of pets) removePetFiles(pet.id);
  run('DELETE FROM users WHERE id = ?', [user.id]);
  res.json({ ok: true });
});

export default router;
