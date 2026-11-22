import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import { all, exec, get, run } from './index.js';
import { config } from '../env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function migrateAccountColumn({ verbose }) {
  const columns = all('PRAGMA table_info(users)');
  if (!columns.some((column) => column.name === 'account')) {
    exec('ALTER TABLE users ADD COLUMN account TEXT');
    if (verbose) console.log('已为 users 添加 account 字段');
  }
  if (!columns.some((column) => column.name === 'profile_completed')) {
    exec('ALTER TABLE users ADD COLUMN profile_completed INTEGER NOT NULL DEFAULT 1');
    if (verbose) console.log('已为 users 添加 profile_completed 字段');
  }
  run("UPDATE users SET account = username WHERE account IS NULL OR account = ''");
  exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_account ON users(account)');
  // 老用户若还没有 3 个密保问题，下次登录必须进入完善页
  run(
    `UPDATE users
        SET profile_completed = CASE
          WHEN role = 'user' AND (
            SELECT COUNT(*) FROM user_security_answers WHERE user_id = users.id
          ) >= 3 THEN 1
          ELSE 0
        END
      WHERE role = 'user'`
  );
}

export function initDatabase({ verbose = true } = {}) {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  exec(schema);
  migrateAccountColumn({ verbose });

  const existing = get("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (!existing) {
    if (!config.adminPassword) {
      if (verbose) console.warn('[warn] 未配置 ADMIN_PASSWORD，跳过管理员账号创建');
      return;
    }
    const hash = bcrypt.hashSync(config.adminPassword, 10);
    run("INSERT INTO users (account, username, password_hash, role) VALUES (?, ?, ?, 'admin')", [
      config.adminUsername,
      config.adminUsername,
      hash
    ]);
    if (verbose) console.log(`管理员账号已创建：${config.adminUsername}（口令来自 .env，未输出）`);
  } else if (verbose) {
    console.log('管理员账号已存在，跳过创建');
  }
  if (verbose) console.log('数据库初始化完成（账号与密保字段已就绪）');
}

export function ensureDatabase() {
  // 每次启动都执行幂等的建表/迁移，保证已有数据库也能补上 account 与密保表
  initDatabase({ verbose: false });
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  initDatabase();
}
