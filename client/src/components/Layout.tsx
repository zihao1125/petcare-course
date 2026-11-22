import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

function PawLogo() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#0f766e" />
      <ellipse cx="16" cy="20" rx="6" ry="5" fill="#fff" />
      <circle cx="9.5" cy="13" r="2.4" fill="#fff" />
      <circle cx="14" cy="10.5" r="2.4" fill="#fff" />
      <circle cx="18.5" cy="10.5" r="2.4" fill="#fff" />
      <circle cx="23" cy="13" r="2.4" fill="#fff" />
    </svg>
  );
}

const navItem = ({ isActive }: { isActive: boolean }) =>
  `rounded-xl px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-teal-50 text-teal-800' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
  }`;

const mobileItem = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
    isActive ? 'text-teal-700' : 'text-slate-400'
  }`;

export default function Layout({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4">
          <Link to={admin ? '/admin' : '/'} className="flex items-center gap-2">
            <PawLogo />
            <span className="text-lg font-bold text-slate-900">宠知微</span>
            {admin && <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-700">管理后台</span>}
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {admin ? (
              <>
                <NavLink to="/admin" end className={navItem}>
                  用户管理
                </NavLink>
                <NavLink to="/settings" className={navItem}>
                  账号设置
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/" end className={navItem}>
                  我的宠物
                </NavLink>
                <NavLink to="/pets/new" className={navItem}>
                  添加宠物
                </NavLink>
                <NavLink to="/settings" className={navItem}>
                  账号设置
                </NavLink>
              </>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden max-w-[10rem] truncate text-sm text-slate-500 sm:inline">{user?.username}</span>
            <button type="button" onClick={handleLogout} className="text-sm text-slate-500 hover:text-slate-800">
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4 md:pb-10">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex">
          {admin ? (
            <>
              <NavLink to="/admin" end className={mobileItem}>
                <span className="text-lg leading-none">◫</span>
                用户管理
              </NavLink>
              <NavLink to="/settings" className={mobileItem}>
                <span className="text-lg leading-none">◎</span>
                账号
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/" end className={mobileItem}>
                <span className="text-lg leading-none">⌂</span>
                首页
              </NavLink>
              <NavLink to="/pets/new" className={mobileItem}>
                <span className="text-lg leading-none">＋</span>
                添加
              </NavLink>
              <NavLink to="/settings" className={mobileItem}>
                <span className="text-lg leading-none">◎</span>
                账号
              </NavLink>
            </>
          )}
        </div>
      </nav>
    </div>
  );
}
