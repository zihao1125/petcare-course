import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import {
  btnDanger,
  btnPrimary,
  btnSecondary,
  Card,
  Confirm,
  ErrorText,
  Field,
  inputCls,
  SectionTitle,
  Spinner
} from '../components/ui';
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
  const [form, setForm] = useState({ ...emptyForm });
  const [pet, setPet] = useState<Pet | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

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
    setBusy(true);
    try {
      const payload = {
        ...form,
        breed: form.breed.trim() || null,
        birthday: form.birthday || null
      };
      let petId = id;
      if (editing) {
        await api(`/pets/${id}`, { method: 'PUT', body: payload });
      } else {
        const created = await api<{ pet: Pet }>('/pets', { method: 'POST', body: payload });
        petId = String(created.pet.id);
      }
      if (avatarFile && petId) {
        const fd = new FormData();
        fd.append('file', avatarFile);
        await api(`/pets/${petId}/avatar`, { method: 'POST', form: fd });
      }
      navigate(`/pets/${petId}`, { replace: true });
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

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-teal-50 text-2xl font-semibold text-teal-700">
              {preview ? <img src={preview} alt="头像预览" className="h-full w-full object-cover" /> : form.name.slice(0, 1) || '宠'}
            </div>
            <div>
              <label className={btnSecondary + ' cursor-pointer'}>
                选择头像
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                />
              </label>
              <p className="mt-1 text-xs text-slate-400">支持 JPG/PNG/WEBP，最大 5MB</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="昵称" required>
              <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="例如：豆豆" maxLength={30} />
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
            <Field label="生日">
              <input type="date" className={inputCls} value={form.birthday} onChange={(e) => set('birthday', e.target.value)} />
            </Field>
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
                {busy ? '保存中…' : '保存'}
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
