import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { btnPrimary, btnSecondary, ErrorText, Field, inputCls } from '../components/ui';
import type { SecurityQuestion } from '../types';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: string; account?: string } | null;
  const from = state?.from && state.from.startsWith('/') ? state.from : '';
  const [account, setAccount] = useState(state?.account || '');
  const [questions, setQuestions] = useState<SecurityQuestion[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!account.trim()) {
      setError('请输入账号');
      return;
    }
    setBusy(true);
    try {
      const data = await api<{ questions: SecurityQuestion[] }>('/auth/security-questions', {
        method: 'POST',
        body: { account: account.trim() }
      });
      setQuestions(data.questions);
      setAnswers(data.questions.map(() => ''));
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取密保问题失败');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (answers.some((answer) => !answer.trim())) {
      setError('请回答全部 3 个密保问题');
      return;
    }
    if (newPassword.length < 6) {
      setError('新密码长度至少为 6 位');
      return;
    }
    if (newPassword !== confirm) {
      setError('两次输入的新密码不一致');
      return;
    }
    setBusy(true);
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: {
          account: account.trim(),
          answers: questions.map((question, index) => ({
            key: question.key,
            answer: answers[index]
          })),
          newPassword
        }
      });
      navigate('/login', {
        replace: true,
        state: { notice: '密码已重置，请使用新密码登录。', from }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-slate-50 to-amber-50 px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">找回密码</h1>
          <p className="mt-1 text-sm text-slate-500">回答注册时设置的 3 个密保问题</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {step === 1 ? (
            <form onSubmit={loadQuestions} className="space-y-4">
              <Field label="账号" required>
                <input
                  className={inputCls}
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="请输入注册时的账号"
                  autoComplete="username"
                />
              </Field>
              <ErrorText>{error}</ErrorText>
              <button type="submit" className={`${btnPrimary} w-full`} disabled={busy}>
                {busy ? '查询中…' : '下一步：回答密保问题'}
              </button>
              <p className="text-xs leading-5 text-slate-400">
                如果账号尚未设置密保问题，请先登录并按提示完善，或联系管理员重置密码。
              </p>
            </form>
          ) : (
            <form onSubmit={resetPassword} className="space-y-4">
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                账号：<span className="font-medium text-slate-800">{account}</span>
              </div>
              {questions.map((question, index) => (
                <Field key={question.key} label={question.label} required>
                  <input
                    className={inputCls}
                    value={answers[index] || ''}
                    onChange={(e) =>
                      setAnswers((prev) => prev.map((value, i) => (i === index ? e.target.value : value)))
                    }
                    placeholder="填写答案"
                    maxLength={100}
                    autoComplete="off"
                  />
                </Field>
              ))}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="新密码" required hint="至少 6 位">
                  <input
                    className={inputCls}
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </Field>
                <Field label="确认新密码" required>
                  <input
                    className={inputCls}
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                </Field>
              </div>
              <ErrorText>{error}</ErrorText>
              <div className="flex gap-2">
                <button type="button" className={btnSecondary} onClick={() => setStep(1)} disabled={busy}>
                  上一步
                </button>
                <button type="submit" className={`${btnPrimary} flex-1`} disabled={busy}>
                  {busy ? '重置中…' : '验证并重置密码'}
                </button>
              </div>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-slate-500">
            <Link to="/login" state={{ from }} className="font-medium text-teal-700 hover:text-teal-900">
              返回登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
