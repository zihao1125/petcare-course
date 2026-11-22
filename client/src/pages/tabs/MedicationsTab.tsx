import { useState } from 'react';
import { api } from '../../api';
import {
  btnPrimary,
  btnGhost,
  Card,
  Empty,
  ErrorText,
  Field,
  inputCls,
  Modal,
  SectionTitle
} from '../../components/ui';
import { dateError, fmtDate, today } from '../../utils';
import type { Medication, PetDetailData } from '../../types';

const emptyForm = { name: '', dosage: '', frequency: '', start_date: '', end_date: '', note: '' };

export default function MedicationsTab({
  petId,
  data,
  reload
}: {
  petId: number;
  data: PetDetailData;
  reload: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, start_date: today() });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('请填写药品名称');
      return;
    }
    const dateMsg = dateError(form.start_date, '开始日期') || dateError(form.end_date, '结束日期');
    if (dateMsg) {
      setError(dateMsg);
      return;
    }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setError('结束日期不能早于开始日期');
      return;
    }
    setBusy(true);
    try {
      await api(`/pets/${petId}/medications`, {
        method: 'POST',
        body: {
          ...form,
          name: form.name.trim(),
          start_date: form.start_date || null,
          end_date: form.end_date || null
        }
      });
      setForm({ ...emptyForm, start_date: today() });
      setOpen(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (record: Medication) => {
    if (!window.confirm(`确定删除用药记录「${record.name}」吗？`)) return;
    try {
      await api(`/pets/${petId}/medications/${record.id}`, { method: 'DELETE' });
      await reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle action={<button type="button" className={btnPrimary} onClick={() => setOpen(true)}>＋ 添加用药</button>}>
          用药记录
        </SectionTitle>
        {data.medications.length === 0 ? (
          <Empty text="暂无用药记录" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.medications.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{m.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {[m.dosage, m.frequency].filter(Boolean).join(' · ') || '未填写剂量/频次'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    用药期：{fmtDate(m.start_date)} ~ {fmtDate(m.end_date)}
                  </p>
                  {m.note && <p className="mt-1 text-xs text-slate-500">{m.note}</p>}
                </div>
                <button type="button" className={btnGhost} onClick={() => remove(m)}>
                  删除
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={open}
        title="添加用药记录"
        onClose={() => setOpen(false)}
        footer={
          <>
            <button type="button" className={btnGhost} onClick={() => setOpen(false)} disabled={busy}>
              取消
            </button>
            <button type="submit" form="med-form" className={btnPrimary} disabled={busy}>
              {busy ? '保存中…' : '保存'}
            </button>
          </>
        }
      >
        <form id="med-form" onSubmit={submit} className="space-y-3">
          <Field label="药品名称" required>
            <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="例如：阿莫西林" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="剂量">
              <input className={inputCls} value={form.dosage} onChange={(e) => set('dosage', e.target.value)} placeholder="例如：50mg" />
            </Field>
            <Field label="频次">
              <input className={inputCls} value={form.frequency} onChange={(e) => set('frequency', e.target.value)} placeholder="例如：每日两次" />
            </Field>
            <Field label="开始日期">
              <input type="date" className={inputCls} value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </Field>
            <Field label="结束日期">
              <input type="date" className={inputCls} value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
            </Field>
          </div>
          <Field label="备注">
            <textarea className={inputCls} rows={2} value={form.note} onChange={(e) => set('note', e.target.value)} maxLength={500} />
          </Field>
          <ErrorText>{error}</ErrorText>
        </form>
      </Modal>
    </div>
  );
}
