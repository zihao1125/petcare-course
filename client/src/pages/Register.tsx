import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { btnPrimary, btnSecondary, ErrorText, Field, inputCls, PasswordInput } from '../components/ui';
import { DEFAULT_QUESTION_KEYS, SECURITY_QUESTIONS } from '../securityQuestions';

const ACCOUNT_RE = /^[A-Za-z0-9_\u4e00-\u9fa5]{3,20}$/;
const USERNAME_RE = /^[\u4e00-\u9fa5A-Za-z0-9_\- ]{1,20}$/;

interface QuestionAnswer {
  key: string;
  answer: string;
}

export default function Register() {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const rawFrom = (location.state as { from?: string } | null)?.from;
  const from = rawFrom && rawFrom.startsWith('/') && !rawFrom.startsWith('//') ? rawFrom : '';
  const target = from && !from.startsWith('/admin') && !from.startsWith('/login') ? from : '/';

  const [step, setStep] = useState<1 | 2>(1);
  const [account, setAccount] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [questions, setQuestions] = useState<QuestionAnswer[]>(
    DEFAULT_QUESTION_KEYS.map((key) => ({ key, answer: '' }))
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') navigate('/admin', { replace: true });
      else if (!user.profileCompleted) navigate('/complete-profile', { replace: true });
      else navigate(target, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, navigate, target]);

  const goStepTwo = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!ACCOUNT_RE.test(account.trim())) {
      setError('账号需为 3-20 位字母、数字、下划线或中文');
      return;
    }
    if (!USERNAME_RE.test(username.trim())) {
      setError('用户名为 1-20 位中文、字母、数字、空格、下划线或短横线');
      return;
    }
    if (password.length < 6) {
      setError('密码长度至少为 6 位');
      return;
    }
    if (password !== confirm) {
      setError('两次输入的密码不一致');
      return;
    }
    setStep(2);
  };

  const setQuestionKey = (index: number, key: string) => {
    setQuestions((prev) => prev.map((item, i) => (i === index ? { ...item, key } : item)));
    setError('');
  };

  const setAnswer = (index: number, answer: string) => {
    setQuestions((prev) => prev.map((item, i) => (i === index ? { ...item, answer } : item)));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
      await register({
        account: account.trim(),
        username: username.trim(),
        password,
        securityQuestions: questions.map((q) => ({ key: q.key, answer: q.answer.trim() }))
      });
      navigate(target, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : '注册失败';
      setError(message);
      if (/账号|用户名/.test(message)) setStep(1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-slate-50 to-amber-50 px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">创建账号</h1>
          <p className="mt-1 text-sm text-slate-500">账号用于登录，用户名作为昵称显示</p>
        </div>

        <div className="mb-4 flex items-center justify-center gap-2 text-xs text-slate-400">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full ${step === 1 ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-800'}`}>1</span>
          <span>账号与密码</span>
          <span className="mx-1 h-px w-8 bg-slate-200" />
          <span className={`flex h-6 w-6 items-center justify-center rounded-full ${step === 2 ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400'}`}>2</span>
          <span>设置密保问题</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {step === 1 ? (
            <form onSubmit={goStepTwo} className="space-y-4">
              <Field label="账号" required hint="3-20 位字母、数字、下划线或中文，用于登录，注册后可在设置中修改">
                <input
                  className={inputCls}
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="例如：doudou_master"
                  autoComplete="username"
                />
              </Field>
              <Field label="用户名" required hint="1-20 位，作为昵称显示，可与账号不同">
                <input
                  className={inputCls}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="例如：豆豆的主人"
                  autoComplete="nickname"
                />
              </Field>
              <Field label="密码" required hint="至少 6 位">
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="设置密码"
                  autoComplete="new-password"
                />
              </Field>
              <Field label="确认密码" required>
                <PasswordInput
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="再次输入密码"
                  autoComplete="new-password"
                />
              </Field>
              <ErrorText>{error}</ErrorText>
              <button type="submit" className={`${btnPrimary} w-full`}>
                下一步：设置密保问题
              </button>
            </form>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="rounded-xl bg-teal-50/70 px-3 py-2 text-xs leading-5 text-teal-800">
                请从 9 个问题中自选 3 个并填写答案。忘记密码时需要 3 个答案全部正确才能重置。
              </div>
              {questions.map((item, index) => (
                <div key={index} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1.1fr_1fr]">
                  <Field label={`密保问题 ${index + 1}`} required>
                    <select
                      className={inputCls}
                      value={item.key}
                      onChange={(e) => setQuestionKey(index, e.target.value)}
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
                      onChange={(e) => setAnswer(index, e.target.value)}
                      placeholder="填写你的答案"
                      maxLength={100}
                      autoComplete="off"
                    />
                  </Field>
                </div>
              ))}
              <p className="text-xs text-slate-400">答案只保存加密结果，不区分大小写，忽略多余空格。</p>
              <ErrorText>{error}</ErrorText>
              <div className="flex gap-2">
                <button type="button" className={btnSecondary} onClick={() => setStep(1)} disabled={busy}>
                  上一步
                </button>
                <button type="submit" className={`${btnPrimary} flex-1`} disabled={busy}>
                  {busy ? '注册中…' : '完成注册并登录'}
                </button>
              </div>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-slate-500">
            已有账号？
            <Link to="/login" state={{ from }} className="font-medium text-teal-700 hover:text-teal-900">
              返回登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
