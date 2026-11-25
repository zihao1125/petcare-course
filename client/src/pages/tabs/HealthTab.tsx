import { useEffect, useMemo, useState } from 'react';
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

type ChoiceKey = 'appetite' | 'water_intake' | 'stool' | 'urine' | 'vomiting' | 'mental_state';

const CHOICES: Array<{ key: ChoiceKey; label: string; options: string[]; hint: string }> = [
  { key: 'appetite', label: '饮食', options: ['正常', '减少', '拒食', '偏多'], hint: '吃了多少、食欲如何' },
  { key: 'water_intake', label: '饮水', options: ['正常', '偏多', '偏少'], hint: '喝水比平时多还是少' },
  { key: 'stool', label: '排便', options: ['正常', '偏软', '腹泻', '便秘', '带血'], hint: '大便的形状和次数' },
  { key: 'urine', label: '排尿', options: ['正常', '偏多', '偏少', '排尿困难', '颜色异常'], hint: '尿量和排尿是否顺畅' },
  { key: 'vomiting', label: '呕吐', options: ['无', '偶发', '频繁', '持续'], hint: '有没有吐、吐了几次' },
  { key: 'mental_state', label: '精神状态', options: ['良好', '一般', '萎靡', '烦躁'], hint: '活泼程度、是否愿意活动' }
];

const emptyCustom = Object.fromEntries(CHOICES.map((c) => [c.key, false])) as Record<ChoiceKey, boolean>;

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

function unrecordedLabels(h: HealthRecord) {
  return CHOICES.filter((choice) => {
    const value = h[choice.key];
    return value === null || value === undefined || value === '';
  }).map((choice) => choice.label);
}

function QuickChoice({
  label,
  hint,
  options,
  value,
  custom,
  onChange,
  onCustom,
  onClear
}: {
  label: string;
  hint: string;
  options: string[];
  value: string;
  custom: boolean;
  onChange: (value: string) => void;
  onCustom: () => void;
  onClear: () => void;
}) {
  const selected = options.includes(value);
  const showInput = custom || (!!value && !selected);
  return (
    <div className="rounded-xl border border-slate-200 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {value ? (
          <button type="button" onClick={onClear} className="text-xs text-slate-400 hover:text-red-600">
            清除
          </button>
        ) : (
          <span className="text-xs text-slate-400">未记录</span>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(value === option ? '' : option)}
            className={`rounded-full border px-2.5 py-1 text-xs transition ${
              value === option
                ? 'border-teal-600 bg-teal-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-800'
            }`}
          >
            {option}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={showInput}
          onClick={onCustom}
          className={`rounded-full border px-2.5 py-1 text-xs transition ${
            showInput
              ? 'border-teal-600 bg-teal-50 text-teal-800'
              : 'border-dashed border-slate-300 bg-white text-slate-500 hover:border-teal-300 hover:text-teal-800'
          }`}
        >
          自行填写
        </button>
      </div>
      {showInput && (
        <input
          className={`${inputCls} mt-2`}
          value={value}
          maxLength={50}
          autoFocus
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${label}的其他情况，例如：只吃了一点点`}
        />
      )}
      <p className="mt-1 text-[11px] text-slate-400">{hint}；不选表示未记录</p>
    </div>
  );
}

export default function HealthTab({
  petId,
  data,
  reload,
  openNew = false,
  highlight = null
}: {
  petId: number;
  data: PetDetailData;
  reload: () => Promise<void>;
  openNew?: boolean;
  highlight?: string | null;
}) {
  const [weightForm, setWeightForm] = useState({ record_date: today(), weight_kg: '', note: '' });
  const [weightError, setWeightError] = useState('');
  const [weightBusy, setWeightBusy] = useState(false);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyHealth });
  const [custom, setCustom] = useState({ ...emptyCustom });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (openNew) setOpen(true);
  }, [openNew]);

  useEffect(() => {
    if (!highlight) return;
    const el = document.getElementById(highlight);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlight]);

  const highlightCls = (key: string) =>
    highlight === key ? 'rounded-lg bg-teal-50/70 ring-2 ring-teal-300 px-2 -mx-2' : '';

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
      setCustom({ ...emptyCustom });
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
              <li
                key={w.id}
                id={`weight-${w.id}`}
                className={`flex items-center justify-between gap-3 py-2.5 ${highlightCls(`weight-${w.id}`)}`}
              >
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
              <li
                key={h.id}
                id={`health-${h.id}`}
                className={`flex items-start justify-between gap-3 py-3 ${highlightCls(`health-${h.id}`)}`}
              >
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
                  {unrecordedLabels(h).length > 0 && (
                    <p className="mt-1 text-xs text-slate-400">未记录：{unrecordedLabels(h).join('、')}</p>
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
        <form id="health-form" onSubmit={submitHealth} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="记录日期" required>
              <input type="date" className={inputCls} value={form.record_date} onChange={(e) => set('record_date', e.target.value)} />
            </Field>
            <Field label="体温（℃）">
              <input type="number" step="0.1" className={inputCls} value={form.temperature} onChange={(e) => set('temperature', e.target.value)} placeholder="例如 38.6" />
            </Field>
          </div>
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
            下面这些情况点一下就能选；不用每项都填，没选的项会记为「未记录」，不会被当成正常。
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {CHOICES.map((choice) => (
              <QuickChoice
                key={choice.key}
                label={choice.label}
                hint={choice.hint}
                options={choice.options}
                value={form[choice.key]}
                custom={custom[choice.key]}
                onChange={(value) => set(choice.key, value)}
                onCustom={() => {
                  setCustom((prev) => ({ ...prev, [choice.key]: true }));
                  if (choice.options.includes(form[choice.key])) set(choice.key, '');
                }}
                onClear={() => {
                  setCustom((prev) => ({ ...prev, [choice.key]: false }));
                  set(choice.key, '');
                }}
              />
            ))}
          </div>
          <div>
            <Field label="症状描述 / 补充说明">
              <textarea
                className={inputCls}
                rows={2}
                value={form.symptoms}
                onChange={(e) => set('symptoms', e.target.value)}
                maxLength={1000}
                placeholder="选填：还有什么想补充的，例如呕吐物颜色、排便次数"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="过敏史">
              <input className={inputCls} value={form.allergy_note} onChange={(e) => set('allergy_note', e.target.value)} placeholder="药物或食物过敏情况" maxLength={500} />
            </Field>
            <Field label="备注">
              <input className={inputCls} value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="选填" maxLength={500} />
            </Field>
          </div>
          <ErrorText>{error}</ErrorText>
        </form>
      </Modal>
    </div>
  );
}
