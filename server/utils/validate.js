import { HttpError } from './http.js';

export function text(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

export function requiredText(value, label, max = 200) {
  const v = text(value);
  if (!v) throw new HttpError(400, `${label}不能为空`);
  if (v.length > max) throw new HttpError(400, `${label}不能超过 ${max} 个字符`);
  return v;
}

export function optionalText(value, max = 2000) {
  const v = text(value);
  if (!v) return null;
  if (v.length > max) throw new HttpError(400, `内容不能超过 ${max} 个字符`);
  return v;
}

export function requiredDate(value, label) {
  const v = text(value);
  if (!v) throw new HttpError(400, `${label}不能为空`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new HttpError(400, `${label}格式应为 YYYY-MM-DD`);
  return v;
}

export function optionalDate(value, label) {
  const v = text(value);
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new HttpError(400, `${label}格式应为 YYYY-MM-DD`);
  return v;
}

export function optionalNumber(value, label, { min = -1e9, max = 1e9 } = {}) {
  if (value === undefined || value === null || text(value) === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new HttpError(400, `${label}必须是数字`);
  if (n < min || n > max) throw new HttpError(400, `${label}超出合理范围`);
  return n;
}

export function requiredNumber(value, label, opts = {}) {
  const n = optionalNumber(value, label, opts);
  if (n === null) throw new HttpError(400, `${label}不能为空`);
  return n;
}

export function oneOf(value, allowed, label, fallback = null) {
  const v = text(value);
  if (!v) {
    if (fallback !== null) return fallback;
    throw new HttpError(400, `请选择${label}`);
  }
  if (!allowed.includes(v)) throw new HttpError(400, `${label}取值不合法`);
  return v;
}
