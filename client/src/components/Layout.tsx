import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

function PawLogo({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#ea580c" />
      <ellipse cx="16" cy="20" rx="6" ry="5" fill="#fff" />
      <circle cx="9.5" cy="13" r="2.4" fill="#fff" />
      <circle cx="14" cy="10.5" r="2.4" fill="#fff" />
      <circle cx="18.5" cy="10.5" r="2.4" fill="#fff" />
      <circle cx="23" cy="13" r="2.4" fill="#fff" />
    </svg>
  );
}

type IconName = 'home' | 'plus' | 'user' | 'users' | 'logout';

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    home: (
      <>
        <path d="M3 10.8 12 3l9 7.8" />
        <path d="M5 9.5V21h14V9.5" />
        <path d="M9.5 21v-6h5v6" />
      </>
    ),
    plus: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 8.5v7M8.5 12h7" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3.8" />
        <path d="M4.5 20c.8-3.6 3.7-5.5 7.5-5.5s6.7 1.9 7.5 5.5" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3 19c.6-3 2.8-4.6 6-4.6s5.4 1.6 6 4.6" />
        <path d="M15.5 5.2a3.2 3.2 0 0 1 0 5.6" />
        <path d="M17 14.8c2.3.4 3.8 1.8 4.3 4.2" />
      </>
    ),
    logout: (
      <>
        <path d="M9 4.5H5.5A1.5 1.5 0 0 0 4 6v12a1.5 1.5 0 0 0 1.5 1.5H9" />
        <path d="M15 8l4 4-4 4" />
        <path d="M19 12H9" />
      </>
    )
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

const desktopNav = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition ${
    isActive
      ? 'bg-teal-50 text-teal-800 shadow-sm ring-1 ring-teal-100'
      : 'text-slate-500 hover:bg-white hover:text-slate-800'
  }`;

const mobileNav = ({ isActive }: { isActive: boolean }) =>
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

  const items = admin
    ? [
        { to: '/admin', label: '用户管理', icon: 'users' as const, end: true },
        { to: '/settings', label: '账号设置', icon: 'user' as const, end: false }
      ]
    : [
        { to: '/', label: '我的宠物', icon: 'home' as const, end: true },
        { to: '/pets/new', label: '添加宠物', icon: 'plus' as const, end: false },
        { to: '/settings', label: '账号设置', icon: 'user' as const, end: false }
      ];

  return (
    <div className="min-h-screen">
      {/* 桌面端左侧导航 */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col overflow-y-auto border-r border-slate-200/70 bg-white/75 px-4 py-6 backdrop-blur md:flex">
        <Link to={admin ? '/admin' : '/'} className="flex items-center gap-3 px-2">
          <PawLogo className="h-10 w-10" />
          <div>
            <p className="text-lg font-bold tracking-wide text-slate-900">宠知微</p>
            <p className="text-xs text-slate-400">{admin ? '管理后台' : '猫狗健康小管家'}</p>
          </div>
        </Link>

        <nav className="mt-8 space-y-1">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={desktopNav}>
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-6">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-800">
              {user?.username.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{user?.username}</p>
              <p className="text-xs text-slate-400">{admin ? '管理员' : '普通用户'}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="退出登录"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <Icon name="logout" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 手机端顶部栏 */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to={admin ? '/admin' : '/'} className="flex items-center gap-2">
            <PawLogo className="h-8 w-8" />
            <span className="text-base font-bold text-slate-900">宠知微</span>
            {admin && <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-800">管理后台</span>}
          </Link>
          <div className="flex items-center gap-3">
            <span className="max-w-[7rem] truncate text-xs text-slate-400">{user?.username}</span>
            <button type="button" onClick={handleLogout} className="text-sm text-slate-500 hover:text-slate-800">
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="md:pl-64">
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:px-8 md:pb-12 md:pt-8">{children}</div>
      </main>

      {/* 手机端底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="flex">
          {admin ? (
            <>
              <NavLink to="/admin" end className={mobileNav}>
                <Icon name="users" className="h-5 w-5" />
                用户管理
              </NavLink>
              <NavLink to="/settings" className={mobileNav}>
                <Icon name="user" className="h-5 w-5" />
                账号
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/" end className={mobileNav}>
                <Icon name="home" className="h-5 w-5" />
                首页
              </NavLink>
              <NavLink to="/pets/new" className={mobileNav}>
                <Icon name="plus" className="h-5 w-5" />
                添加
              </NavLink>
              <NavLink to="/settings" className={mobileNav}>
                <Icon name="user" className="h-5 w-5" />
                账号
              </NavLink>
            </>
          )}
        </div>
      </nav>
    </div>
  );
}
