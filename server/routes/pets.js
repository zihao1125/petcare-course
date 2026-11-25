import express from 'express';
import { all, get, run } from '../db/index.js';
import { HttpError } from '../utils/http.js';
import { requiredText, optionalText, optionalDate, oneOf, text } from '../utils/validate.js';
import { requireAuth, requireRole, loadPet } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';
import { publicUrl, removeFileByUrl, removePetFiles } from '../utils/files.js';

const router = express.Router();
router.use(requireAuth, requireRole('user'));

function petPayload(body) {
  return {
    name: requiredText(body.name, '宠物昵称', 30),
    species: oneOf(body.species, ['cat', 'dog'], '宠物类型'),
    breed: optionalText(body.breed, 50),
    gender: oneOf(body.gender, ['male', 'female', 'unknown'], '性别', 'unknown'),
    birthday: optionalDate(body.birthday, '生日'),
    neutered: oneOf(body.neutered, ['yes', 'no', 'unknown'], '绝育状态', 'unknown'),
    note: optionalText(body.note, 500)
  };
}

function petWithCounts(pet) {
  const counts = get(
    `SELECT
       (SELECT COUNT(*) FROM health_records WHERE pet_id = ?) AS health,
       (SELECT COUNT(*) FROM weight_records WHERE pet_id = ?) AS weights,
       (SELECT COUNT(*) FROM vet_visits WHERE pet_id = ?) AS visits,
       (SELECT COUNT(*) FROM vaccinations WHERE pet_id = ?) AS vaccinations,
       (SELECT COUNT(*) FROM dewormings WHERE pet_id = ?) AS dewormings,
       (SELECT COUNT(*) FROM medications WHERE pet_id = ?) AS medications,
       (SELECT COUNT(*) FROM pet_photos WHERE pet_id = ?) AS photos`,
    [pet.id, pet.id, pet.id, pet.id, pet.id, pet.id, pet.id]
  );
  return { ...pet, counts };
}

router.get('/', (req, res) => {
  const pets = all('SELECT * FROM pets WHERE user_id = ? ORDER BY id DESC', [req.user.id]);
  res.json({ pets: pets.map(petWithCounts) });
});

router.get('/reminders', (req, res) => {
  const rows = all(
    `SELECT 'vaccination' AS kind, v.id AS record_id, v.pet_id, p.name AS pet_name,
            v.vaccine_name AS title, v.next_due_date AS due_date
       FROM vaccinations v JOIN pets p ON p.id = v.pet_id
      WHERE p.user_id = ? AND v.next_due_date IS NOT NULL
        AND date(v.next_due_date) <= date('now', 'localtime', '+7 day')
     UNION ALL
     SELECT 'deworming', d.id, d.pet_id, p.name, d.type, d.next_due_date
       FROM dewormings d JOIN pets p ON p.id = d.pet_id
      WHERE p.user_id = ? AND d.next_due_date IS NOT NULL
        AND date(d.next_due_date) <= date('now', 'localtime', '+7 day')
     UNION ALL
     SELECT 'followup', vt.id, vt.pet_id, p.name, '复诊：' || COALESCE(NULLIF(vt.diagnosis, ''), '未填写诊断'), vt.followup_date
       FROM vet_visits vt JOIN pets p ON p.id = vt.pet_id
      WHERE p.user_id = ? AND vt.followup_date IS NOT NULL
        AND date(vt.followup_date) <= date('now', 'localtime', '+7 day')
     ORDER BY due_date ASC
     LIMIT 100`,
    [req.user.id, req.user.id, req.user.id]
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  res.json({
    reminders: rows.map((r) => ({
      ...r,
      days_left: Math.round((new Date(`${r.due_date}T00:00:00`).getTime() - today.getTime()) / 86400000)
    }))
  });
});

router.post('/', (req, res) => {
  const p = petPayload(req.body || {});
  const result = run(
    'INSERT INTO pets (user_id, name, species, breed, gender, birthday, neutered, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [req.user.id, p.name, p.species, p.breed, p.gender, p.birthday, p.neutered, p.note]
  );
  const pet = get('SELECT * FROM pets WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json({ pet: petWithCounts(pet) });
});

router.get('/:petId', loadPet, (req, res) => {
  res.json({ pet: petWithCounts(req.pet) });
});

router.put('/:petId', loadPet, (req, res) => {
  const p = petPayload(req.body || {});
  run(
    'UPDATE pets SET name = ?, species = ?, breed = ?, gender = ?, birthday = ?, neutered = ?, note = ? WHERE id = ?',
    [p.name, p.species, p.breed, p.gender, p.birthday, p.neutered, p.note, req.pet.id]
  );
  const pet = get('SELECT * FROM pets WHERE id = ?', [req.pet.id]);
  res.json({ pet: petWithCounts(pet) });
});

router.delete('/:petId', loadPet, (req, res) => {
  removePetFiles(req.pet.id);
  run('DELETE FROM pets WHERE id = ?', [req.pet.id]);
  res.json({ ok: true });
});

router.post('/:petId/avatar', loadPet, uploadImage.single('file'), (req, res) => {
  if (!req.file) throw new HttpError(400, '请选择要上传的图片');
  const url = publicUrl(req.pet.id, req.file.filename);
  if (req.pet.avatar_path) removeFileByUrl(req.pet.avatar_path);
  run('UPDATE pets SET avatar_path = ? WHERE id = ?', [url, req.pet.id]);
  const pet = get('SELECT * FROM pets WHERE id = ?', [req.pet.id]);
  res.json({ pet: petWithCounts(pet) });
});

export default router;
