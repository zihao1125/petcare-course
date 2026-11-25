CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account TEXT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  profile_completed INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS user_security_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  answer_hash TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  UNIQUE (user_id, question_key)
);

CREATE TABLE IF NOT EXISTS pets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('cat', 'dog')),
  breed TEXT,
  gender TEXT DEFAULT 'unknown',
  birthday TEXT,
  neutered TEXT DEFAULT 'unknown',
  avatar_path TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS pet_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  caption TEXT,
  tags TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS weight_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  record_date TEXT NOT NULL,
  weight_kg REAL NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS health_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  record_date TEXT NOT NULL,
  temperature REAL,
  appetite TEXT,
  water_intake TEXT,
  stool TEXT,
  urine TEXT,
  vomiting TEXT,
  mental_state TEXT,
  symptoms TEXT,
  allergy_note TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS medications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  start_date TEXT,
  end_date TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS vet_visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  visit_date TEXT NOT NULL,
  hospital TEXT,
  doctor TEXT,
  department TEXT,
  chief_complaint TEXT,
  diagnosis TEXT,
  prescription TEXT,
  cost REAL,
  followup_date TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS vet_visit_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_id INTEGER NOT NULL REFERENCES vet_visits(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS vaccinations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  vaccine_name TEXT NOT NULL,
  dose_no TEXT,
  date TEXT NOT NULL,
  next_due_date TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS dewormings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  next_due_date TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS forum_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS forum_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'video', 'file')),
  size INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS forum_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES forum_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_pets_user ON pets(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_user ON forum_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_attachments_post ON forum_attachments(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_post ON forum_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_user ON forum_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_security_user ON user_security_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_pet ON pet_photos(pet_id);
CREATE INDEX IF NOT EXISTS idx_weights_pet ON weight_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_health_pet ON health_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_meds_pet ON medications(pet_id);
CREATE INDEX IF NOT EXISTS idx_visits_pet ON vet_visits(pet_id);
CREATE INDEX IF NOT EXISTS idx_visit_images_visit ON vet_visit_images(visit_id);
CREATE INDEX IF NOT EXISTS idx_vacc_pet ON vaccinations(pet_id);
CREATE INDEX IF NOT EXISTS idx_deworm_pet ON dewormings(pet_id);
