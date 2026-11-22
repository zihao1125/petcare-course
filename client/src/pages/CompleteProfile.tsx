import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { btnPrimary, btnSecondary, ErrorText, Field, inputCls, Spinner } from '../components/ui';
import { DEFAULT_QUESTION_KEYS, SECURITY_QUESTIONS } from '../securityQuestions';
import type { SecurityQuestion, User } from '../types';

interface QuestionAnswer {
  key: string;
  answer: string;
}

export default function CompleteProfile() {
  const { user, loading, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/';

  const [account, setAccount] = useState('');
  const [questions, setQuestions] = useState<QuestionAnswer[]>(
    DEFAULT_QUESTION_KEYS.map((key) => ({ key, answer: '' }))
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true, state: { from: '/complete-profile' } });
      return;
    }
    if (user.role === 'admin') {
      navigate('/admin', { replace: true });
      return;
    }
    if (user.profileCompleted) {
      navigate(from, { replace: true });
      return;
    }
    setAccount(user.account || user.username);
    api<{ questions: SecurityQuestion[] }>('/auth/security-questions/me')
      .then((data) => {
        if (data.questions.length === 3) {
          setQuestions(data.questions.map((question) => ({ key: question.key, answer: '' })));
        }
        setReady(true);
      })
      .catch(() => setReady(true));
  }, [loading, user, navigate, from]);

  if (loading || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner text="正在检查账号信息…" />
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^[A-Za-z0-9_\u4e00-\u9fa5]{3,20}$/.test(account.trim())) {
      setError('账号需为 3-20 位字母、数字、下划线或中文');
      return;
    }
    if (new Set(questions.map((q) => q.key)).size !== 3) {
      setError('3 个密保问题不能重复');
      return;
    }
    if (questions.some((q) => !q.answer.trim())) {
      setError('请回答全部 3 个密保问题');
      return;
    }
    setBusy(true);
    try {
      const data = await api<{ user: User }>('/auth/complete-profile', {
        method: 'POST',
        body: {
          account: account.trim(),
          securityQuestions: questions.map((q) => ({ key: q.key, answer: q.answer.trim() }))
        }
      });
      setUser(data.user);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-slate-50 to-amber-50 px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">完善账号信息</h1>
          <p className="mt-1 text-sm text-slate-500">
            为了账号安全与密码找回，请确认登录账号并设置 3 个密保问题
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
            当前账号尚未完成新版注册信息（账号 + 密保问题），完成前无法使用宠物记录功能。
          </div>
          <form onSubmit={submit} className="space-y-4">
            <Field label="登录账号" required hint="预填为原用户名，可修改；修改后下次登录请使用新账号">
              <input
                className={inputCls}
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                autoComplete="username"
              />
            </Field>
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
              用户名（昵称）：<span className="font-medium text-slate-800">{user?.username}</span>
            </div>

            {questions.map((item, index) => (
              <div key={index} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1.1fr_1fr]">
                <Field label={`密保问题 ${index + 1}`} required>
                  <select
                    className={inputCls}
                    value={item.key}
                    onChange={(e) => {
                      const key = e.target.value;
                      setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, key } : q)));
                      setError('');
                    }}
                  >
                    {SECURITY_QUESTIONS.map((q) => (
                      <option key={q.key} value={q.key}>
                        {q.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="答案" required>
                  <input
                    className={inputCls}
                    value={item.answer}
                    onChange={(e) =>
                      setQuestions((prev) =>
                        prev.map((q, i) => (i === index ? { ...q, answer: e.target.value } : q))
                      )
                    }
                    placeholder="填写你的答案"
                    maxLength={100}
                    autoComplete="off"
                  />
                </Field>
              </div>
            ))}

            <ErrorText>{error}</ErrorText>
            <button type="submit" className={`${btnPrimary} w-full`} disabled={busy}>
              {busy ? '保存中…' : '保存并继续'}
            </button>
          </form>

          <div className="mt-4 flex justify-center">
            <button
              type="button"
              className={btnSecondary}
              onClick={async () => {
                await logout();
                navigate('/login', { replace: true });
              }}
            >
              退出登录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
