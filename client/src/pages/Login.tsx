import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { btnPrimary, ErrorText, Field, inputCls, Spinner } from '../components/ui';
import type { Role } from '../types';

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const rawFrom = (location.state as { from?: string } | null)?.from;
  const from = rawFrom && rawFrom.startsWith('/') && !rawFrom.startsWith('//') ? rawFrom : '';
  const [role, setRole] = useState<Role>('user');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const targetFor = (nextRole: Role) => {
    if (nextRole === 'admin') return from.startsWith('/admin') ? from : '/admin';
    return from && !from.startsWith('/admin') && !from.startsWith('/login') ? from : '/';
  };

  useEffect(() => {
    if (!loading && user) navigate(targetFor(user.role), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, navigate, from]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('请输入用户名和密码');
      return;
    }
    setBusy(true);
    try {
      const u = await login(username.trim(), password, role);
      navigate(targetFor(u.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-slate-50 to-amber-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-2xl font-bold text-white">
            宠
          </div>
          <h1 className="text-2xl font-bold text-slate-900">宠知微</h1>
          <p className="mt-1 text-sm text-slate-500">猫狗健康档案，一处记录、随时查看</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            {(['user', 'admin'] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRole(r);
                  setError('');
                }}
                className={`rounded-lg py-2 text-sm font-medium transition ${
                  role === r ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500'
                }`}
              >
                {r === 'user' ? '用户登录' : '管理员登录'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="用户名" required>
              <input
                className={inputCls}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={role === 'admin' ? '管理员账号' : '请输入用户名'}
                autoComplete="username"
              />
            </Field>
            <Field label="密码" required>
              <input
                className={inputCls}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </Field>
            <ErrorText>{error}</ErrorText>
            <button type="submit" className={`${btnPrimary} w-full`} disabled={busy}>
              {busy ? '登录中…' : role === 'admin' ? '进入管理后台' : '登录'}
            </button>
          </form>

          {role === 'user' ? (
            <p className="mt-4 text-center text-sm text-slate-500">
              还没有账号？
              <Link to="/register" state={{ from }} className="font-medium text-teal-700 hover:text-teal-900">
                立即注册
              </Link>
            </p>
          ) : (
            <p className="mt-4 text-center text-xs text-slate-400">管理员账号由系统初始化脚本创建</p>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">宠知微 · 宠物健康记录 PWA</p>
      </div>
    </div>
  );
}
