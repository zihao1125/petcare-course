export const SPECIES_LABEL: Record<string, string> = { cat: '猫', dog: '狗' };
export const GENDER_LABEL: Record<string, string> = { male: '公', female: '母', unknown: '未知' };
export const NEUTERED_LABEL: Record<string, string> = { yes: '已绝育', no: '未绝育', unknown: '未知' };

export function today() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function isRealDate(value: string) {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!matched) return false;
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function dateError(value: string, label: string, required = false): string | null {
  if (!value) return required ? `${label}不能为空` : null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${label}格式应为 YYYY-MM-DD`;
  if (!isRealDate(value)) return `${label}不是有效日期，请检查年月日`;
  return null;
}

export function ageText(birthday?: string | null) {
  if (!birthday) return '生日未填写';
  const birth = new Date(`${birthday}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return '生日未填写';
  const now = new Date();
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) return '生日未填写';
  if (months < 1) {
    const days = Math.max(0, Math.floor((now.getTime() - birth.getTime()) / 86400000));
    return `${days} 天`;
  }
  if (months < 12) return `${months} 个月`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years} 岁 ${rest} 个月` : `${years} 岁`;
}

export function petMeta(pet: { species?: string; breed?: string | null; birthday?: string | null }) {
  return [SPECIES_LABEL[pet.species || ''] || '宠物', pet.breed || '', ageText(pet.birthday)]
    .filter(Boolean)
    .join(' · ');
}

export function fmtDate(value?: string | null) {
  if (!value) return '—';
  return value.slice(0, 10);
}

export function daysUntil(dateStr?: string | null) {
  if (!dateStr) return null;
  const target = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

export function dueInfo(dateStr?: string | null) {
  const days = daysUntil(dateStr);
  if (days === null) return { text: '未设置', className: 'bg-slate-100 text-slate-500' };
  if (days < 0) return { text: `已逾期 ${Math.abs(days)} 天`, className: 'bg-red-100 text-red-700' };
  if (days === 0) return { text: '今天到期', className: 'bg-red-100 text-red-700' };
  if (days <= 7) return { text: `${days} 天后到期`, className: 'bg-amber-100 text-amber-700' };
  return { text: `${days} 天后`, className: 'bg-slate-100 text-slate-500' };
}

export function dueGroup(daysLeft: number): 'overdue' | 'today' | 'soon' {
  if (daysLeft < 0) return 'overdue';
  if (daysLeft === 0) return 'today';
  return 'soon';
}

export function reminderTarget(reminder: { kind: string; pet_id: number; record_id: number }) {
  if (reminder.kind === 'followup') {
    return { tab: 'visits' as const, record: `visit-${reminder.record_id}`, label: '复诊' };
  }
  if (reminder.kind === 'deworming') {
    return { tab: 'prevention' as const, record: `deworm-${reminder.record_id}`, label: '驱虫' };
  }
  return { tab: 'prevention' as const, record: `vacc-${reminder.record_id}`, label: '疫苗' };
}

export function reminderLink(reminder: { kind: string; pet_id: number; record_id: number }) {
  const target = reminderTarget(reminder);
  return `/pets/${reminder.pet_id}?tab=${target.tab}&record=${target.record}`;
}

export function fmtMoney(value?: number | null) {
  if (value === null || value === undefined) return '—';
  return `¥${Number(value).toFixed(2)}`;
}

export function sumCounts(counts?: object | null) {
  if (!counts) return 0;
  return Object.values(counts).reduce((a: number, b) => a + (typeof b === 'number' ? b : 0), 0);
}
