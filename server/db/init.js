import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import { exec, get, run, hasTable } from './index.js';
import { config } from '../env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function initDatabase({ verbose = true } = {}) {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  exec(schema);

  const existing = get("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (!existing) {
    if (!config.adminPassword) {
      if (verbose) console.warn('[warn] 未配置 ADMIN_PASSWORD，跳过管理员账号创建');
      return;
    }
    const hash = bcrypt.hashSync(config.adminPassword, 10);
    run("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')", [
      config.adminUsername,
      hash
    ]);
    if (verbose) console.log(`管理员账号已创建：${config.adminUsername}（口令来自 .env，未输出）`);
  } else if (verbose) {
    console.log('管理员账号已存在，跳过创建');
  }
  if (verbose) console.log('数据库初始化完成');
}

export function ensureDatabase() {
  if (!hasTable('users')) {
    initDatabase({ verbose: false });
  }
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  initDatabase();
}
