import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, downloadExport } from '../api';
import { useAuth } from '../auth';
import {
  btnDanger,
  btnPrimary,
  btnSecondary,
  Card,
  Confirm,
  ErrorText,
  Field,
  inputCls,
  SectionTitle
} from '../components/ui';
import { fmtDate } from '../utils';

function Notice({ kind, text }: { kind: 'ok' | 'err'; text: string }) {
  return (
    <p className={`rounded-xl px-3 py-2 text-sm ${kind === 'ok' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'}`}>
      {text}
    </p>
  );
}

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const [pwd, setPwd] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [pwdMsg, setPwdMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [pwdBusy, setPwdBusy] = useState(false);

  const [exportBusy, setExportBusy] = useState(false);
  const [exportMsg, setExportMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const [deletePassword, setDeletePassword] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    if (!pwd.oldPassword || !pwd.newPassword) {
      setPwdMsg({ kind: 'err', text: '请填写原密码和新密码' });
      return;
    }
    if (pwd.newPassword.length < 6) {
      setPwdMsg({ kind: 'err', text: '新密码长度至少为 6 位' });
      return;
    }
    if (pwd.newPassword !== pwd.confirm) {
      setPwdMsg({ kind: 'err', text: '两次输入的新密码不一致' });
      return;
    }
    setPwdBusy(true);
    try {
      await api('/auth/change-password', { method: 'POST', body: pwd });
      setPwd({ oldPassword: '', newPassword: '', confirm: '' });
      setPwdMsg({ kind: 'ok', text: '密码已修改，下次登录请使用新密码' });
    } catch (err) {
      setPwdMsg({ kind: 'err', text: err instanceof Error ? err.message : '修改失败' });
    } finally {
      setPwdBusy(false);
    }
  };

  const handleExport = async () => {
    setExportMsg(null);
    setExportBusy(true);
    try {
      await downloadExport();
      setExportMsg({ kind: 'ok', text: '数据已导出为 JSON 文件' });
    } catch (err) {
      setExportMsg({ kind: 'err', text: err instanceof Error ? err.message : '导出失败' });
    } finally {
      setExportBusy(false);
    }
  };

  const handleDelete = async () => {
    setDeleteMsg(null);
    setDeleteBusy(true);
    try {
      await api('/auth/delete-account', { method: 'POST', body: { password: deletePassword } });
      setUser(null);
      navigate('/login', { replace: true });
    } catch (err) {
      setDeleteMsg({ kind: 'err', text: err instanceof Error ? err.message : '注销失败' });
      setDeleteBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">账号设置</h1>
        <p className="mt-1 text-sm text-slate-500">管理登录密码与个人数据</p>
      </div>

      <Card>
        <SectionTitle>账号信息</SectionTitle>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-slate-400">用户名</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{user?.username}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">角色</dt>
            <dd className="mt-0.5 text-slate-800">{isAdmin ? '管理员' : '普通用户'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">注册时间</dt>
            <dd className="mt-0.5 text-slate-800">{fmtDate(user?.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">账号状态</dt>
            <dd className="mt-0.5 text-slate-800">{user?.status === 'active' ? '正常' : '已禁用'}</dd>
          </div>
        </dl>
        <div className="mt-4">
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
      </Card>

      <Card>
        <SectionTitle>修改密码</SectionTitle>
        <form onSubmit={changePassword} className="space-y-3">
          <Field label="原密码" required>
            <input
              type="password"
              className={inputCls}
              value={pwd.oldPassword}
              onChange={(e) => setPwd((p) => ({ ...p, oldPassword: e.target.value }))}
              autoComplete="current-password"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="新密码" required>
              <input
                type="password"
                className={inputCls}
                value={pwd.newPassword}
                onChange={(e) => setPwd((p) => ({ ...p, newPassword: e.target.value }))}
                autoComplete="new-password"
              />
            </Field>
            <Field label="确认新密码" required>
              <input
                type="password"
                className={inputCls}
                value={pwd.confirm}
                onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
                autoComplete="new-password"
              />
            </Field>
          </div>
          {pwdMsg && <Notice kind={pwdMsg.kind} text={pwdMsg.text} />}
          <button type="submit" className={btnPrimary} disabled={pwdBusy}>
            {pwdBusy ? '保存中…' : '修改密码'}
          </button>
        </form>
      </Card>

      <Card>
        <SectionTitle>我的数据</SectionTitle>
        {isAdmin ? (
          <p className="text-sm text-slate-500">管理员账号不包含宠物业务数据，不支持导出或注销。</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className={btnSecondary} onClick={handleExport} disabled={exportBusy}>
                {exportBusy ? '导出中…' : '导出全部数据（JSON）'}
              </button>
              <span className="text-xs text-slate-400">包含宠物档案、健康、就医、防疫、用药与照片地址</span>
            </div>
            {exportMsg && (
              <div className="mt-3">
                <Notice kind={exportMsg.kind} text={exportMsg.text} />
              </div>
            )}

            <div className="mt-5 rounded-xl border border-red-200 bg-red-50/50 p-3">
              <p className="text-sm font-medium text-red-700">注销账号</p>
              <p className="mt-1 text-xs text-red-600">注销会永久删除账号、全部宠物档案、记录和上传的图片，无法恢复。</p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <div className="min-w-[12rem] flex-1">
                  <Field label="输入密码确认">
                    <input
                      type="password"
                      className={inputCls}
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  className={btnDanger}
                  disabled={!deletePassword}
                  onClick={() => {
                    setDeleteMsg(null);
                    setDeleteOpen(true);
                  }}
                >
                  注销账号
                </button>
              </div>
              {deleteMsg && (
                <div className="mt-3">
                  <ErrorText>{deleteMsg.text}</ErrorText>
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      <Confirm
        open={deleteOpen}
        title="确认注销账号"
        message="这是不可撤销的操作。账号下的宠物、健康记录、就医记录、照片和报告图片都会被永久删除，确定继续吗？"
        confirmText="确认注销"
        busy={deleteBusy}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
