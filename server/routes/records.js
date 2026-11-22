import express from 'express';
import { all, get, run } from '../db/index.js';
import { HttpError } from '../utils/http.js';
import {
  requiredText,
  optionalText,
  requiredDate,
  optionalDate,
  optionalNumber,
  requiredNumber
} from '../utils/validate.js';
import { requireAuth, requireRole, loadPet } from '../middleware/auth.js';
import { uploadImage, uploadImages } from '../middleware/upload.js';
import { publicUrl, removeFileByUrl } from '../utils/files.js';

const router = express.Router({ mergeParams: true });
router.use(requireAuth, requireRole('user'), loadPet);

function recordDeleted(changes) {
  if (!changes) throw new HttpError(404, '记录不存在');
}

function loadVisit(req, res, next) {
  const visit = get('SELECT * FROM vet_visits WHERE id = ? AND pet_id = ?', [
    Number(req.params.visitId),
    req.pet.id
  ]);
  if (!visit) return next(new HttpError(404, '就诊记录不存在'));
  req.visit = visit;
  next();
}

/* ---------------- 体重 ---------------- */

router.get('/weights', (req, res) => {
  const records = all('SELECT * FROM weight_records WHERE pet_id = ? ORDER BY record_date DESC, id DESC', [
    req.pet.id
  ]);
  res.json({ records });
});

router.post('/weights', (req, res) => {
  const body = req.body || {};
  const recordDate = requiredDate(body.record_date, '记录日期');
  const weight = requiredNumber(body.weight_kg, '体重', { min: 0.1, max: 200 });
  const result = run('INSERT INTO weight_records (pet_id, record_date, weight_kg, note) VALUES (?, ?, ?, ?)', [
    req.pet.id,
    recordDate,
    weight,
    optionalText(body.note, 500)
  ]);
  res.status(201).json({ record: get('SELECT * FROM weight_records WHERE id = ?', [result.lastInsertRowid]) });
});

router.delete('/weights/:recordId', (req, res) => {
  const result = run('DELETE FROM weight_records WHERE id = ? AND pet_id = ?', [
    Number(req.params.recordId),
    req.pet.id
  ]);
  recordDeleted(result.changes);
  res.json({ ok: true });
});

/* ---------------- 身体状况 ---------------- */

router.get('/health', (req, res) => {
  const records = all('SELECT * FROM health_records WHERE pet_id = ? ORDER BY record_date DESC, id DESC', [
    req.pet.id
  ]);
  res.json({ records });
});

router.post('/health', (req, res) => {
  const body = req.body || {};
  const values = {
    record_date: requiredDate(body.record_date, '记录日期'),
    temperature: optionalNumber(body.temperature, '体温', { min: 20, max: 50 }),
    appetite: optionalText(body.appetite, 50),
    water_intake: optionalText(body.water_intake, 50),
    stool: optionalText(body.stool, 100),
    urine: optionalText(body.urine, 100),
    vomiting: optionalText(body.vomiting, 100),
    mental_state: optionalText(body.mental_state, 50),
    symptoms: optionalText(body.symptoms, 1000),
    allergy_note: optionalText(body.allergy_note, 500),
    note: optionalText(body.note, 500)
  };
  const result = run(
    `INSERT INTO health_records
      (pet_id, record_date, temperature, appetite, water_intake, stool, urine, vomiting, mental_state, symptoms, allergy_note, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.pet.id,
      values.record_date,
      values.temperature,
      values.appetite,
      values.water_intake,
      values.stool,
      values.urine,
      values.vomiting,
      values.mental_state,
      values.symptoms,
      values.allergy_note,
      values.note
    ]
  );
  res.status(201).json({ record: get('SELECT * FROM health_records WHERE id = ?', [result.lastInsertRowid]) });
});

router.delete('/health/:recordId', (req, res) => {
  const result = run('DELETE FROM health_records WHERE id = ? AND pet_id = ?', [
    Number(req.params.recordId),
    req.pet.id
  ]);
  recordDeleted(result.changes);
  res.json({ ok: true });
});

/* ---------------- 用药 ---------------- */

router.get('/medications', (req, res) => {
  const records = all('SELECT * FROM medications WHERE pet_id = ? ORDER BY id DESC', [req.pet.id]);
  res.json({ records });
});

router.post('/medications', (req, res) => {
  const body = req.body || {};
  const name = requiredText(body.name, '药品名称', 100);
  const startDate = optionalDate(body.start_date, '开始日期');
  const endDate = optionalDate(body.end_date, '结束日期');
  if (endDate && !startDate) throw new HttpError(400, '请先填写开始日期');
  if (startDate && endDate && endDate < startDate) throw new HttpError(400, '结束日期不能早于开始日期');
  const result = run(
    'INSERT INTO medications (pet_id, name, dosage, frequency, start_date, end_date, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      req.pet.id,
      name,
      optionalText(body.dosage, 100),
      optionalText(body.frequency, 100),
      startDate,
      endDate,
      optionalText(body.note, 500)
    ]
  );
  res.status(201).json({ record: get('SELECT * FROM medications WHERE id = ?', [result.lastInsertRowid]) });
});

router.delete('/medications/:recordId', (req, res) => {
  const result = run('DELETE FROM medications WHERE id = ? AND pet_id = ?', [
    Number(req.params.recordId),
    req.pet.id
  ]);
  recordDeleted(result.changes);
  res.json({ ok: true });
});

/* ---------------- 就医 ---------------- */

router.get('/visits', (req, res) => {
  const visits = all('SELECT * FROM vet_visits WHERE pet_id = ? ORDER BY visit_date DESC, id DESC', [req.pet.id]);
  res.json({
    records: visits.map((v) => ({
      ...v,
      images: all('SELECT id, file_path FROM vet_visit_images WHERE visit_id = ? ORDER BY id', [v.id])
    }))
  });
});

router.post('/visits', (req, res) => {
  const body = req.body || {};
  const result = run(
    `INSERT INTO vet_visits
      (pet_id, visit_date, hospital, doctor, department, chief_complaint, diagnosis, prescription, cost, followup_date, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.pet.id,
      requiredDate(body.visit_date, '就诊日期'),
      optionalText(body.hospital, 100),
      optionalText(body.doctor, 50),
      optionalText(body.department, 50),
      optionalText(body.chief_complaint, 1000),
      optionalText(body.diagnosis, 1000),
      optionalText(body.prescription, 1000),
      optionalNumber(body.cost, '费用', { min: 0, max: 10000000 }),
      optionalDate(body.followup_date, '复诊日期'),
      optionalText(body.note, 500)
    ]
  );
  const visit = get('SELECT * FROM vet_visits WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json({ record: { ...visit, images: [] } });
});

router.delete('/visits/:visitId', loadVisit, (req, res) => {
  const images = all('SELECT file_path FROM vet_visit_images WHERE visit_id = ?', [req.visit.id]);
  for (const img of images) removeFileByUrl(img.file_path);
  run('DELETE FROM vet_visits WHERE id = ?', [req.visit.id]);
  res.json({ ok: true });
});

router.post('/visits/:visitId/images', loadVisit, uploadImages.array('files', 6), (req, res) => {
  const files = req.files || [];
  if (!files.length) throw new HttpError(400, '请选择要上传的图片');
  const created = [];
  for (const file of files) {
    const url = publicUrl(req.pet.id, file.filename);
    const result = run('INSERT INTO vet_visit_images (visit_id, file_path) VALUES (?, ?)', [req.visit.id, url]);
    created.push({ id: result.lastInsertRowid, file_path: url });
  }
  res.status(201).json({ images: created });
});

router.delete('/visits/:visitId/images/:imageId', loadVisit, (req, res) => {
  const image = get(
    'SELECT vi.* FROM vet_visit_images vi JOIN vet_visits v ON v.id = vi.visit_id WHERE vi.id = ? AND v.pet_id = ?',
    [Number(req.params.imageId), req.pet.id]
  );
  if (!image) throw new HttpError(404, '图片不存在');
  removeFileByUrl(image.file_path);
  run('DELETE FROM vet_visit_images WHERE id = ?', [image.id]);
  res.json({ ok: true });
});

/* ---------------- 疫苗 ---------------- */

router.get('/vaccinations', (req, res) => {
  const records = all('SELECT * FROM vaccinations WHERE pet_id = ? ORDER BY date DESC, id DESC', [req.pet.id]);
  res.json({ records });
});

router.post('/vaccinations', (req, res) => {
  const body = req.body || {};
  const result = run(
    'INSERT INTO vaccinations (pet_id, vaccine_name, dose_no, date, next_due_date, note) VALUES (?, ?, ?, ?, ?, ?)',
    [
      req.pet.id,
      requiredText(body.vaccine_name, '疫苗名称', 100),
      optionalText(body.dose_no, 50),
      requiredDate(body.date, '接种日期'),
      optionalDate(body.next_due_date, '下次到期日期'),
      optionalText(body.note, 500)
    ]
  );
  res.status(201).json({ record: get('SELECT * FROM vaccinations WHERE id = ?', [result.lastInsertRowid]) });
});

router.delete('/vaccinations/:recordId', (req, res) => {
  const result = run('DELETE FROM vaccinations WHERE id = ? AND pet_id = ?', [
    Number(req.params.recordId),
    req.pet.id
  ]);
  recordDeleted(result.changes);
  res.json({ ok: true });
});

/* ---------------- 驱虫 ---------------- */

router.get('/dewormings', (req, res) => {
  const records = all('SELECT * FROM dewormings WHERE pet_id = ? ORDER BY date DESC, id DESC', [req.pet.id]);
  res.json({ records });
});

router.post('/dewormings', (req, res) => {
  const body = req.body || {};
  const result = run(
    'INSERT INTO dewormings (pet_id, type, date, next_due_date, note) VALUES (?, ?, ?, ?, ?)',
    [
      req.pet.id,
      requiredText(body.type, '驱虫类型', 100),
      requiredDate(body.date, '驱虫日期'),
      optionalDate(body.next_due_date, '下次到期日期'),
      optionalText(body.note, 500)
    ]
  );
  res.status(201).json({ record: get('SELECT * FROM dewormings WHERE id = ?', [result.lastInsertRowid]) });
});

router.delete('/dewormings/:recordId', (req, res) => {
  const result = run('DELETE FROM dewormings WHERE id = ? AND pet_id = ?', [
    Number(req.params.recordId),
    req.pet.id
  ]);
  recordDeleted(result.changes);
  res.json({ ok: true });
});

/* ---------------- 生活照 ---------------- */

router.get('/photos', (req, res) => {
  const records = all('SELECT * FROM pet_photos WHERE pet_id = ? ORDER BY id DESC', [req.pet.id]);
  res.json({ records });
});

router.post('/photos', uploadImage.single('file'), (req, res) => {
  if (!req.file) throw new HttpError(400, '请选择要上传的图片');
  const body = req.body || {};
  const url = publicUrl(req.pet.id, req.file.filename);
  const result = run('INSERT INTO pet_photos (pet_id, file_path, caption, tags) VALUES (?, ?, ?, ?)', [
    req.pet.id,
    url,
    optionalText(body.caption, 200),
    optionalText(body.tags, 100)
  ]);
  res.status(201).json({ record: get('SELECT * FROM pet_photos WHERE id = ?', [result.lastInsertRowid]) });
});

router.delete('/photos/:photoId', (req, res) => {
  const photo = get('SELECT * FROM pet_photos WHERE id = ? AND pet_id = ?', [
    Number(req.params.photoId),
    req.pet.id
  ]);
  if (!photo) throw new HttpError(404, '照片不存在');
  removeFileByUrl(photo.file_path);
  run('DELETE FROM pet_photos WHERE id = ?', [photo.id]);
  res.json({ ok: true });
});

export default router;
