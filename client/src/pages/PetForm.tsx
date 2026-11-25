import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import DatePicker from '../components/DatePicker';
import ImageDropzone from '../components/ImageDropzone';
import {
  btnDanger,
  btnPrimary,
  btnSecondary,
  Card,
  Confirm,
  ErrorText,
  Field,
  inputCls,
  labelCls,
  SectionTitle,
  Spinner
} from '../components/ui';
import { dateError } from '../utils';
import type { Pet } from '../types';

const emptyForm = {
  name: '',
  species: 'cat',
  breed: '',
  gender: 'unknown',
  birthday: '',
  neutered: 'unknown',
  note: ''
};

export default function PetForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const flash = (location.state as { avatarError?: string } | null)?.avatarError;

  const [form, setForm] = useState({ ...emptyForm });
  const [pet, setPet] = useState<Pet | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [avatarNotice, setAvatarNotice] = useState(flash || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (flash) setAvatarNotice(flash);
  }, [flash]);

  useEffect(() => {
    if (!id) return;
    api<{ pet: Pet }>(`/pets/${id}`)
      .then((d) => {
        setPet(d.pet);
        setForm({
          name: d.pet.name,
          species: d.pet.species,
          breed: d.pet.breed || '',
          gender: d.pet.gender || 'unknown',
          birthday: d.pet.birthday || '',
          neutered: d.pet.neutered || 'unknown',
          note: d.pet.note || ''
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'));
  }, [id]);

  useEffect(() => {
    if (!avatarFile) {
      setPreview(pet?.avatar_path || '');
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile, pet]);

  if (editing && !pet && !error) return <Spinner />;

  const set = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('请填写宠物昵称');
      return;
    }
    const birthdayError = dateError(form.birthday, '生日');
    if (birthdayError) {
      setError(birthdayError);
      return;
    }

    setBusy(true);
    let targetId: string | null = id || null;
    try {
      const payload = {
        ...form,
        breed: form.breed.trim() || null,
        birthday: form.birthday || null
      };

      if (editing) {
        await api(`/pets/${id}`, { method: 'PUT', body: payload });
      } else {
        const created = await api<{ pet: Pet }>('/pets', { method: 'POST', body: payload });
        targetId = String(created.pet.id);
      }

      if (!targetId) throw new Error('宠物档案保存失败');

      if (avatarFile) {
        const fd = new FormData();
        fd.append('file', avatarFile);
        try {
          await api(`/pets/${targetId}/avatar`, { method: 'POST', form: fd });
        } catch (avatarErr) {
          const reason = avatarErr instanceof Error ? avatarErr.message : '上传失败';
          // 档案已经落库：跳到该宠物的编辑页重试头像，避免再次点击保存时重复建档
          navigate(`/pets/${targetId}/edit`, {
            replace: true,
            state: {
              avatarError: `档案已保存，但头像上传失败：${reason}。请重新选择头像后保存，不会重复创建宠物。`
            }
          });
          return;
        }
      }

      navigate(`/pets/${targetId}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await api(`/pets/${id}`, { method: 'DELETE' });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{editing ? '编辑宠物' : '添加宠物'}</h1>
        <p className="mt-1 text-sm text-slate-500">档案信息用于生成年龄、性别等基础展示</p>
      </div>

      {avatarNotice && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
          {avatarNotice}
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <SectionTitle>宠物头像</SectionTitle>
          <ImageDropzone
            onFiles={(files) => {
              setAvatarFile(files[0]);
              setAvatarNotice('');
            }}
            preview={preview || undefined}
            onClear={avatarFile ? () => setAvatarFile(null) : undefined}
            title="点击或拖拽上传宠物头像"
            hint="支持 JPG / PNG / WEBP，单张不超过 5MB"
            previewAlt="头像预览"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="昵称" required>
              <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="例如：团团" maxLength={30} />
            </Field>
            <Field label="宠物类型" required>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'cat', label: '猫' },
                  { value: 'dog', label: '狗' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set('species', opt.value)}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                      form.species === opt.value
                        ? 'border-teal-600 bg-teal-50 text-teal-800'
                        : 'border-slate-300 bg-white text-slate-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="品种">
              <input className={inputCls} value={form.breed} onChange={(e) => set('breed', e.target.value)} placeholder="例如：英短、柯基" maxLength={50} />
            </Field>
            <Field label="性别">
              <select className={inputCls} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="unknown">未知</option>
                <option value="male">公</option>
                <option value="female">母</option>
              </select>
            </Field>
            <div>
              <span className={labelCls}>生日</span>
              <DatePicker value={form.birthday} onChange={(v) => set('birthday', v)} placeholder="请选择生日" />
              <span className="mt-1 block text-xs text-slate-400">可切换年份或月份快速定位</span>
            </div>
            <Field label="绝育状态">
              <select className={inputCls} value={form.neutered} onChange={(e) => set('neutered', e.target.value)}>
                <option value="unknown">未知</option>
                <option value="yes">已绝育</option>
                <option value="no">未绝育</option>
              </select>
            </Field>
          </div>

          <Field label="备注">
            <textarea
              className={inputCls}
              rows={3}
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
              placeholder="性格、习惯、注意事项等"
              maxLength={500}
            />
          </Field>

          <ErrorText>{error}</ErrorText>

          <div className="flex flex-wrap justify-between gap-2">
            <div>
              {editing && (
                <button type="button" className={btnDanger} onClick={() => setConfirmOpen(true)} disabled={busy}>
                  删除宠物
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" className={btnSecondary} onClick={() => navigate(-1)} disabled={busy}>
                取消
              </button>
              <button type="submit" className={btnPrimary} disabled={busy}>
                {busy ? '保存中…' : editing ? '保存修改' : '保存并创建档案'}
              </button>
            </div>
          </div>
        </form>
      </Card>

      <Confirm
        open={confirmOpen}
        title="删除宠物"
        message={`确定删除「${form.name}」吗？该宠物的所有记录和照片都会一并删除，且无法恢复。`}
        confirmText="确认删除"
        busy={busy}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
