import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import {
  Badge,
  btnGhost,
  btnPrimary,
  btnSecondary,
  Card,
  Confirm,
  Empty,
  ErrorText,
  Field,
  inputCls,
  Modal,
  SectionTitle,
  Spinner
} from '../components/ui';
import { fmtDate } from '../utils';
import type { AdminOverview, AdminUser } from '../types';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = async (query = q) => {
    setError('');
    try {
      const [overview, list] = await Promise.all([
        api<{ stats: AdminOverview }>('/admin/overview'),
        api<{ users: AdminUser[] }>(`/admin/users?q=${encodeURIComponent(query)}`)
      ]);
      setStats(overview.stats);
      setUsers(list.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleStatus = async (user: AdminUser) => {
    const next = user.status === 'active' ? 'disabled' : 'active';
    if (!window.confirm(`确定${next === 'disabled' ? '禁用' : '启用'}用户「${user.account}」吗？`)) return;
    try {
      await api(`/admin/users/${user.id}/status`, { method: 'PATCH', body: { status: next } });
      setNotice(`已${next === 'disabled' ? '禁用' : '启用'}用户 ${user.account}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetError('');
    if (newPassword.length < 6) {
      setResetError('新密码长度至少为 6 位');
      return;
    }
    setResetBusy(true);
    try {
      await api(`/admin/users/${resetTarget.id}/reset-password`, { method: 'POST', body: { newPassword } });
      setNotice(`已重置用户 ${resetTarget.username} 的密码`);
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      setResetError(err instanceof Error ? err.message : '重置失败');
    } finally {
      setResetBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await api(`/admin/users/${deleteTarget.id}`, { method: 'DELETE' });
      setNotice(`已删除用户 ${deleteTarget.username} 及其全部数据`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
      setDeleteTarget(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  if (loading) return <Spinner />;

  const cards: Array<[string, number]> = [
    ['用户总数', stats?.users || 0],
    ['宠物总数', stats?.pets || 0],
    ['记录总数', stats?.records || 0],
    ['近 7 天到期', stats?.due_soon || 0]
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 md:text-2xl">用户管理</h1>
        <p className="mt-1 text-sm text-slate-500">管理后台为只读查看业务数据，仅可执行账号管理操作</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(([label, value]) => (
          <Card key={label} className="!p-4">
            <p className="text-xs text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          </Card>
        ))}
      </div>

      <ErrorText>{error}</ErrorText>
      {notice && <p className="rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-700">{notice}</p>}

      <Card>
        <SectionTitle
          action={
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                load(q);
              }}
            >
              <input className={`${inputCls} w-40 sm:w-56`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索账号或用户名" />
              <button type="submit" className={btnSecondary}>
                搜索
              </button>
            </form>
          }
        >
          用户列表
        </SectionTitle>

        {users.length === 0 ? (
          <Empty text="没有匹配的用户" />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-slate-400">
                  <tr className="border-b border-slate-100">
                    <th className="py-2 font-medium">账号</th>
                    <th className="py-2 font-medium">用户名</th>
                    <th className="py-2 font-medium">宠物数</th>
                    <th className="py-2 font-medium">注册时间</th>
                    <th className="py-2 font-medium">状态</th>
                    <th className="py-2 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-50">
                      <td className="py-2.5 font-medium text-slate-800">{user.account}</td>
                      <td className="py-2.5 text-slate-600">{user.username}</td>
                      <td className="py-2.5 text-slate-600">{user.pet_count}</td>
                      <td className="py-2.5 text-slate-500">{fmtDate(user.created_at)}</td>
                      <td className="py-2.5">
                        <Badge className={user.status === 'active' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-600'}>
                          {user.status === 'active' ? '正常' : '已禁用'}
                        </Badge>
                      </td>
                      <td className="py-2.5">
                        <div className="flex justify-end gap-2">
                          <Link to={`/admin/users/${user.id}`} className={btnGhost}>
                            查看
                          </Link>
                          <button type="button" className={btnGhost} onClick={() => toggleStatus(user)}>
                            {user.status === 'active' ? '禁用' : '启用'}
                          </button>
                          <button
                            type="button"
                            className={btnGhost}
                            onClick={() => {
                              setResetTarget(user);
                              setNewPassword('');
                              setResetError('');
                            }}
                          >
                            重置密码
                          </button>
                          <button type="button" className="text-sm font-medium text-red-600 hover:text-red-800" onClick={() => setDeleteTarget(user)}>
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {users.map((user) => (
                <div key={user.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{user.account}</p>
                      <p className="text-xs text-slate-500">昵称：{user.username}</p>
                      <p className="text-xs text-slate-400">
                        {user.pet_count} 只宠物 · {fmtDate(user.created_at)}
                      </p>
                    </div>
                    <Badge className={user.status === 'active' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-600'}>
                      {user.status === 'active' ? '正常' : '已禁用'}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm">
                    <Link to={`/admin/users/${user.id}`} className={btnGhost}>
                      查看
                    </Link>
                    <button type="button" className={btnGhost} onClick={() => toggleStatus(user)}>
                      {user.status === 'active' ? '禁用' : '启用'}
                    </button>
                    <button
                      type="button"
                      className={btnGhost}
                      onClick={() => {
                        setResetTarget(user);
                        setNewPassword('');
                        setResetError('');
                      }}
                    >
                      重置密码
                    </button>
                    <button type="button" className="text-sm font-medium text-red-600" onClick={() => setDeleteTarget(user)}>
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <Modal
        open={!!resetTarget}
        title={`重置密码：${resetTarget?.username || ''}`}
        onClose={() => setResetTarget(null)}
        footer={
          <>
            <button type="button" className={btnGhost} onClick={() => setResetTarget(null)} disabled={resetBusy}>
              取消
            </button>
            <button type="submit" form="reset-form" className={btnPrimary} disabled={resetBusy}>
              {resetBusy ? '保存中…' : '确认重置'}
            </button>
          </>
        }
      >
        <form id="reset-form" onSubmit={submitReset} className="space-y-3">
          <Field label="新密码" required hint="至少 6 位，请线下告知用户">
            <input
              type="text"
              className={inputCls}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="off"
            />
          </Field>
          <ErrorText>{resetError}</ErrorText>
        </form>
      </Modal>

      <Confirm
        open={!!deleteTarget}
        title="删除用户"
        message={`确定删除用户「${deleteTarget?.username || ''}」吗？该用户的宠物、健康记录、照片和报告图片都会一并删除，且无法恢复。`}
        confirmText="确认删除"
        busy={deleteBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
