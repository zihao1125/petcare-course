import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { api } from '../../api';
import {
  btnGhost,
  btnPrimary,
  Card,
  Empty,
  ErrorText,
  Field,
  inputCls,
  Modal,
  SectionTitle
} from '../../components/ui';
import { dateError, fmtDate, today } from '../../utils';
import type { HealthRecord, PetDetailData, WeightRecord } from '../../types';

const emptyHealth = {
  record_date: today(),
  temperature: '',
  appetite: '',
  water_intake: '',
  stool: '',
  urine: '',
  vomiting: '',
  mental_state: '',
  symptoms: '',
  allergy_note: '',
  note: ''
};

function healthMeta(h: HealthRecord) {
  const pairs: Array<[string, string | number | null | undefined]> = [
    ['体温', h.temperature != null ? `${h.temperature}℃` : ''],
    ['食欲', h.appetite],
    ['饮水', h.water_intake],
    ['排便', h.stool],
    ['排尿', h.urine],
    ['呕吐', h.vomiting],
    ['精神', h.mental_state]
  ];
  return pairs.filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => `${k}：${v}`);
}

export default function HealthTab({
  petId,
  data,
  reload
}: {
  petId: number;
  data: PetDetailData;
  reload: () => Promise<void>;
}) {
  const [weightForm, setWeightForm] = useState({ record_date: today(), weight_kg: '', note: '' });
  const [weightError, setWeightError] = useState('');
  const [weightBusy, setWeightBusy] = useState(false);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyHealth });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const chartData = useMemo(
    () =>
      [...data.weights]
        .sort((a, b) => a.record_date.localeCompare(b.record_date))
        .map((w) => ({ date: w.record_date.slice(5), '体重(kg)': w.weight_kg })),
    [data.weights]
  );

  const addWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    setWeightError('');
    if (!weightForm.weight_kg) {
      setWeightError('请填写体重');
      return;
    }
    const dateMsg = dateError(weightForm.record_date, '记录日期', true);
    if (dateMsg) {
      setWeightError(dateMsg);
      return;
    }
    setWeightBusy(true);
    try {
      await api(`/pets/${petId}/weights`, {
        method: 'POST',
        body: {
          record_date: weightForm.record_date || today(),
          weight_kg: Number(weightForm.weight_kg),
          note: weightForm.note || null
        }
      });
      setWeightForm({ record_date: today(), weight_kg: '', note: '' });
      await reload();
    } catch (err) {
      setWeightError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setWeightBusy(false);
    }
  };

  const removeWeight = async (record: WeightRecord) => {
    if (!window.confirm(`确定删除 ${record.record_date} 的体重记录吗？`)) return;
    try {
      await api(`/pets/${petId}/weights/${record.id}`, { method: 'DELETE' });
      await reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const submitHealth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const dateMsg = dateError(form.record_date, '记录日期', true);
    if (dateMsg) {
      setError(dateMsg);
      return;
    }
    setBusy(true);
    try {
      await api(`/pets/${petId}/health`, {
        method: 'POST',
        body: {
          ...form,
          record_date: form.record_date || today(),
          temperature: form.temperature === '' ? null : Number(form.temperature)
        }
      });
      setForm({ ...emptyHealth, record_date: today() });
      setOpen(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  const removeHealth = async (record: HealthRecord) => {
    if (!window.confirm(`确定删除 ${record.record_date} 的身体状况记录吗？`)) return;
    try {
      await api(`/pets/${petId}/health/${record.id}`, { method: 'DELETE' });
      await reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const set = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>体重记录</SectionTitle>
        <form onSubmit={addWeight} className="grid gap-2 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
          <Field label="日期">
            <input
              type="date"
              className={inputCls}
              value={weightForm.record_date}
              onChange={(e) => setWeightForm((p) => ({ ...p, record_date: e.target.value }))}
            />
          </Field>
          <Field label="体重（kg）" required>
            <input
              type="number"
              step="0.01"
              min="0.1"
              className={inputCls}
              value={weightForm.weight_kg}
              onChange={(e) => setWeightForm((p) => ({ ...p, weight_kg: e.target.value }))}
              placeholder="例如 4.2"
            />
          </Field>
          <Field label="备注">
            <input
              className={inputCls}
              value={weightForm.note}
              onChange={(e) => setWeightForm((p) => ({ ...p, note: e.target.value }))}
              placeholder="选填"
            />
          </Field>
          <button type="submit" className={btnPrimary} disabled={weightBusy}>
            {weightBusy ? '保存中…' : '添加'}
          </button>
        </form>
        <ErrorText>{weightError}</ErrorText>

        {chartData.length >= 2 && (
          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                <Tooltip />
                <Line type="monotone" dataKey="体重(kg)" stroke="#0f766e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {data.weights.length === 0 ? (
          <div className="mt-3">
            <Empty text="暂无体重记录，添加后可查看趋势图" />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {data.weights.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="text-sm text-slate-800">
                    {w.weight_kg} kg
                    <span className="ml-2 text-xs text-slate-400">{fmtDate(w.record_date)}</span>
                  </p>
                  {w.note && <p className="text-xs text-slate-400">{w.note}</p>}
                </div>
                <button type="button" className={btnGhost} onClick={() => removeWeight(w)}>
                  删除
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <SectionTitle
          action={
            <button type="button" className={btnPrimary} onClick={() => setOpen(true)}>
              ＋ 记录身体状况
            </button>
          }
        >
          身体状况
        </SectionTitle>
        {data.health.length === 0 ? (
          <Empty text="暂无身体状况记录" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.health.map((h) => (
              <li key={h.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{fmtDate(h.record_date)}</p>
                  {healthMeta(h).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {healthMeta(h).map((item) => (
                        <span key={item} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                  {h.symptoms && <p className="mt-1 text-xs text-slate-600">症状：{h.symptoms}</p>}
                  {h.allergy_note && <p className="mt-1 text-xs text-red-600">过敏：{h.allergy_note}</p>}
                  {h.note && <p className="mt-1 text-xs text-slate-500">备注：{h.note}</p>}
                </div>
                <button type="button" className={btnGhost} onClick={() => removeHealth(h)}>
                  删除
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={open}
        title="记录身体状况"
        onClose={() => setOpen(false)}
        wide
        footer={
          <>
            <button type="button" className={btnGhost} onClick={() => setOpen(false)} disabled={busy}>
              取消
            </button>
            <button type="submit" form="health-form" className={btnPrimary} disabled={busy}>
              {busy ? '保存中…' : '保存'}
            </button>
          </>
        }
      >
        <form id="health-form" onSubmit={submitHealth} className="grid gap-3 sm:grid-cols-2">
          <Field label="记录日期" required>
            <input type="date" className={inputCls} value={form.record_date} onChange={(e) => set('record_date', e.target.value)} />
          </Field>
          <Field label="体温（℃）">
            <input type="number" step="0.1" className={inputCls} value={form.temperature} onChange={(e) => set('temperature', e.target.value)} placeholder="例如 38.6" />
          </Field>
          <Field label="饮食">
            <input className={inputCls} value={form.appetite} onChange={(e) => set('appetite', e.target.value)} placeholder="正常 / 减少 / 拒食" />
          </Field>
          <Field label="饮水">
            <input className={inputCls} value={form.water_intake} onChange={(e) => set('water_intake', e.target.value)} placeholder="正常 / 偏多 / 偏少" />
          </Field>
          <Field label="排便">
            <input className={inputCls} value={form.stool} onChange={(e) => set('stool', e.target.value)} placeholder="正常 / 偏软 / 腹泻 / 便秘" />
          </Field>
          <Field label="排尿">
            <input className={inputCls} value={form.urine} onChange={(e) => set('urine', e.target.value)} placeholder="正常 / 偏多 / 偏少" />
          </Field>
          <Field label="呕吐">
            <input className={inputCls} value={form.vomiting} onChange={(e) => set('vomiting', e.target.value)} placeholder="无 / 偶发 / 频繁" />
          </Field>
          <Field label="精神状态">
            <input className={inputCls} value={form.mental_state} onChange={(e) => set('mental_state', e.target.value)} placeholder="良好 / 一般 / 萎靡" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="症状描述">
              <textarea className={inputCls} rows={2} value={form.symptoms} onChange={(e) => set('symptoms', e.target.value)} maxLength={1000} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="过敏史">
              <input className={inputCls} value={form.allergy_note} onChange={(e) => set('allergy_note', e.target.value)} placeholder="药物或食物过敏情况" maxLength={500} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="备注">
              <textarea className={inputCls} rows={2} value={form.note} onChange={(e) => set('note', e.target.value)} maxLength={500} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <ErrorText>{error}</ErrorText>
          </div>
        </form>
      </Modal>
    </div>
  );
}
