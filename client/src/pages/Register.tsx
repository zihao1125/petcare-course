import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { btnPrimary, ErrorText, Field, inputCls } from '../components/ui';

export default function Register() {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate(user.role === 'admin' ? '/admin' : '/', { replace: true });
  }, [loading, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^[A-Za-z0-9_\u4e00-\u9fa5]{3,20}$/.test(username.trim())) {
      setError('用户名需为 3-20 位字母、数字、下划线或中文');
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
    setBusy(true);
    try {
      await register(username.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-slate-50 to-cyan-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">创建账号</h1>
          <p className="mt-1 text-sm text-slate-500">注册后即可为宠物建立健康档案</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="用户名" required hint="3-20 位字母、数字、下划线或中文，注册后不可修改">
              <input
                className={inputCls}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="例如：doudou_master"
                autoComplete="username"
              />
            </Field>
            <Field label="密码" required hint="至少 6 位">
              <input
                className={inputCls}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="设置密码"
                autoComplete="new-password"
              />
            </Field>
            <Field label="确认密码" required>
              <input
                className={inputCls}
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="再次输入密码"
                autoComplete="new-password"
              />
            </Field>
            <ErrorText>{error}</ErrorText>
            <button type="submit" className={`${btnPrimary} w-full`} disabled={busy}>
              {busy ? '注册中…' : '注册并登录'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            已有账号？
            <Link to="/login" className="font-medium text-teal-700 hover:text-teal-900">
              返回登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
