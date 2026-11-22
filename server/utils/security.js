import { HttpError } from './http.js';

export const SECURITY_QUESTIONS = [
  { key: 'primary_school', label: '你的小学' },
  { key: 'middle_school', label: '你的初中' },
  { key: 'high_school', label: '你的高中' },
  { key: 'university', label: '你的大学' },
  { key: 'father_name', label: '你父亲的名字' },
  { key: 'mother_name', label: '你母亲的名字' },
  { key: 'favorite_food', label: '你最爱吃什么' },
  { key: 'memorable_place', label: '令你难忘的地方' },
  { key: 'best_friend', label: '你最好的朋友' }
];

const QUESTION_MAP = new Map(SECURITY_QUESTIONS.map((q) => [q.key, q]));

export function securityQuestionLabel(key) {
  return QUESTION_MAP.get(key)?.label || key;
}

export function normalizeAnswer(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function validateSecurityQuestionSet(items) {
  if (!Array.isArray(items) || items.length !== 3) {
    throw new HttpError(400, '请选择并回答 3 个密保问题');
  }
  const seen = new Set();
  return items.map((item, index) => {
    const key = String(item?.key || '');
    if (!QUESTION_MAP.has(key)) throw new HttpError(400, '密保问题不合法');
    if (seen.has(key)) throw new HttpError(400, '3 个密保问题不能重复');
    seen.add(key);
    const answer = normalizeAnswer(item?.answer);
    if (!answer) throw new HttpError(400, `请填写第 ${index + 1} 个密保问题的答案`);
    if (answer.length > 100) throw new HttpError(400, '密保答案不能超过 100 个字符');
    return { key, answer, position: index + 1 };
  });
}
