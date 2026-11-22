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

export const DEFAULT_QUESTION_KEYS = ['primary_school', 'father_name', 'favorite_food'];

export function securityQuestionLabel(key: string) {
  return SECURITY_QUESTIONS.find((q) => q.key === key)?.label || key;
}
