import { useEffect, useState } from 'react';
import { api } from '../../api';
import {
  Badge,
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
import { dateError, daysUntil, dueInfo, fmtDate, today } from '../../utils';
import type { Deworming, PetDetailData, Vaccination } from '../../types';

export default function PreventionTab({
  petId,
  data,
  reload,
  highlight = null
}: {
  petId: number;
  data: PetDetailData;
  reload: () => Promise<void>;
  highlight?: string | null;
}) {
  const [vaccOpen, setVaccOpen] = useState(false);
  const [vaccEditingId, setVaccEditingId] = useState<number | null>(null);
  const [vaccForm, setVaccForm] = useState({ vaccine_name: '', dose_no: '', date: today(), next_due_date: '', note: '' });
  const [vaccError, setVaccError] = useState('');
  const [vaccBusy, setVaccBusy] = useState(false);

  const [wormOpen, setWormOpen] = useState(false);
  const [wormEditingId, setWormEditingId] = useState<number | null>(null);
  const [wormForm, setWormForm] = useState({ type: '', date: today(), next_due_date: '', note: '' });
  const [wormError, setWormError] = useState('');
  const [wormBusy, setWormBusy] = useState(false);

  useEffect(() => {
    if (!highlight) return;
    const el = document.getElementById(highlight);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlight]);

  const highlightCls = (key: string) =>
    highlight === key ? 'rounded-lg ring-2 ring-teal-300 bg-teal-50/60 px-2 -mx-2' : '';

  const openVaccNew = () => {
    setVaccEditingId(null);
    setVaccForm({ vaccine_name: '', dose_no: '', date: today(), next_due_date: '', note: '' });
    setVaccError('');
    setVaccOpen(true);
  };

  const openVaccEdit = (record: Vaccination) => {
    setVaccEditingId(record.id);
    setVaccForm({
      vaccine_name: record.vaccine_name,
      dose_no: record.dose_no || '',
      date: record.date,
      next_due_date: record.next_due_date || '',
      note: record.note || ''
    });
    setVaccError('');
    setVaccOpen(true);
  };

  const closeVacc = () => {
    setVaccOpen(false);
    setVaccEditingId(null);
  };

  const openWormNew = () => {
    setWormEditingId(null);
    setWormForm({ type: '', date: today(), next_due_date: '', note: '' });
    setWormError('');
    setWormOpen(true);
  };

  const openWormEdit = (record: Deworming) => {
    setWormEditingId(record.id);
    setWormForm({
      type: record.type,
      date: record.date,
      next_due_date: record.next_due_date || '',
      note: record.note || ''
    });
    setWormError('');
    setWormOpen(true);
  };

  const closeWorm = () => {
    setWormOpen(false);
    setWormEditingId(null);
  };

  const submitVacc = async (e: React.FormEvent) => {
    e.preventDefault();
    setVaccError('');
    if (!vaccForm.vaccine_name.trim()) {
      setVaccError('请填写疫苗名称');
      return;
    }
    const dateMsg = dateError(vaccForm.date, '接种日期', true) || dateError(vaccForm.next_due_date, '下次到期日期');
    if (dateMsg) {
      setVaccError(dateMsg);
      return;
    }
    setVaccBusy(true);
    try {
      const body = { ...vaccForm, next_due_date: vaccForm.next_due_date || null };
      if (vaccEditingId) {
        await api(`/pets/${petId}/vaccinations/${vaccEditingId}`, { method: 'PUT', body });
      } else {
        await api(`/pets/${petId}/vaccinations`, { method: 'POST', body });
      }
      setVaccForm({ vaccine_name: '', dose_no: '', date: today(), next_due_date: '', note: '' });
      closeVacc();
      await reload();
    } catch (err) {
      setVaccError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setVaccBusy(false);
    }
  };

  const submitWorm = async (e: React.FormEvent) => {
    e.preventDefault();
    setWormError('');
    if (!wormForm.type.trim()) {
      setWormError('请填写驱虫类型');
      return;
    }
    const dateMsg = dateError(wormForm.date, '驱虫日期', true) || dateError(wormForm.next_due_date, '下次到期日期');
    if (dateMsg) {
      setWormError(dateMsg);
      return;
    }
    setWormBusy(true);
    try {
      const body = { ...wormForm, next_due_date: wormForm.next_due_date || null };
      if (wormEditingId) {
        await api(`/pets/${petId}/dewormings/${wormEditingId}`, { method: 'PUT', body });
      } else {
        await api(`/pets/${petId}/dewormings`, { method: 'POST', body });
      }
      setWormForm({ type: '', date: today(), next_due_date: '', note: '' });
      closeWorm();
      await reload();
    } catch (err) {
      setWormError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setWormBusy(false);
    }
  };

  const removeVacc = async (record: Vaccination) => {
    if (!window.confirm(`确定删除疫苗记录「${record.vaccine_name}」吗？`)) return;
    await api(`/pets/${petId}/vaccinations/${record.id}`, { method: 'DELETE' }).then(reload).catch((err) => window.alert(err.message));
  };

  const removeWorm = async (record: Deworming) => {
    if (!window.confirm(`确定删除驱虫记录「${record.type}」吗？`)) return;
    await api(`/pets/${petId}/dewormings/${record.id}`, { method: 'DELETE' }).then(reload).catch((err) => window.alert(err.message));
  };

  const rowClass = (next?: string | null) => {
    const days = daysUntil(next);
    if (days === null) return '';
    if (days <= 0) return 'rounded-lg bg-red-50 px-2 -mx-2';
    if (days <= 7) return 'rounded-lg bg-amber-50 px-2 -mx-2';
    return '';
  };

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle action={<button type="button" className={btnPrimary} onClick={openVaccNew}>＋ 添加疫苗</button>}>
          疫苗记录
        </SectionTitle>
        {data.vaccinations.length === 0 ? (
          <Empty text="暂无疫苗记录" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.vaccinations.map((v) => {
              const due = dueInfo(v.next_due_date);
              return (
                <li
                  key={v.id}
                  id={`vacc-${v.id}`}
                  className={`flex items-start justify-between gap-3 py-3 ${rowClass(v.next_due_date)} ${highlightCls(`vacc-${v.id}`)}`}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {v.vaccine_name}
                      {v.dose_no ? ` · ${v.dose_no}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">接种日期：{fmtDate(v.date)}</p>
                    <p className="text-xs text-slate-500">下次到期：{fmtDate(v.next_due_date)}</p>
                    {v.note && <p className="mt-1 text-xs text-slate-400">{v.note}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={due.className}>{due.text}</Badge>
                    <div className="flex items-center gap-2">
                      <button type="button" className={btnGhost} onClick={() => openVaccEdit(v)}>
                        修改
                      </button>
                      <button type="button" className={btnGhost} onClick={() => removeVacc(v)}>
                        删除
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <SectionTitle action={<button type="button" className={btnPrimary} onClick={openWormNew}>＋ 添加驱虫</button>}>
          驱虫记录
        </SectionTitle>
        {data.dewormings.length === 0 ? (
          <Empty text="暂无驱虫记录" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.dewormings.map((d) => {
              const due = dueInfo(d.next_due_date);
              return (
                <li
                  key={d.id}
                  id={`deworm-${d.id}`}
                  className={`flex items-start justify-between gap-3 py-3 ${rowClass(d.next_due_date)} ${highlightCls(`deworm-${d.id}`)}`}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">{d.type}</p>
                    <p className="mt-0.5 text-xs text-slate-500">驱虫日期：{fmtDate(d.date)}</p>
                    <p className="text-xs text-slate-500">下次到期：{fmtDate(d.next_due_date)}</p>
                    {d.note && <p className="mt-1 text-xs text-slate-400">{d.note}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={due.className}>{due.text}</Badge>
                    <div className="flex items-center gap-2">
                      <button type="button" className={btnGhost} onClick={() => openWormEdit(d)}>
                        修改
                      </button>
                      <button type="button" className={btnGhost} onClick={() => removeWorm(d)}>
                        删除
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal
        open={vaccOpen}
        title={vaccEditingId ? '修改疫苗记录' : '添加疫苗记录'}
        onClose={closeVacc}
        footer={
          <>
            <button type="button" className={btnGhost} onClick={closeVacc} disabled={vaccBusy}>
              取消
            </button>
            <button type="submit" form="vacc-form" className={btnPrimary} disabled={vaccBusy}>
              {vaccBusy ? '保存中…' : '保存'}
            </button>
          </>
        }
      >
        <form id="vacc-form" onSubmit={submitVacc} className="space-y-3">
          <Field label="疫苗名称" required>
            <input className={inputCls} value={vaccForm.vaccine_name} onChange={(e) => setVaccForm((p) => ({ ...p, vaccine_name: e.target.value }))} placeholder="例如：猫三联" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="针次">
              <input className={inputCls} value={vaccForm.dose_no} onChange={(e) => setVaccForm((p) => ({ ...p, dose_no: e.target.value }))} placeholder="例如：第 3 针" />
            </Field>
            <Field label="接种日期" required>
              <input type="date" className={inputCls} value={vaccForm.date} onChange={(e) => setVaccForm((p) => ({ ...p, date: e.target.value }))} />
            </Field>
            <Field label="下次到期日期">
              <input type="date" className={inputCls} value={vaccForm.next_due_date} onChange={(e) => setVaccForm((p) => ({ ...p, next_due_date: e.target.value }))} />
            </Field>
            <Field label="备注">
              <input className={inputCls} value={vaccForm.note} onChange={(e) => setVaccForm((p) => ({ ...p, note: e.target.value }))} />
            </Field>
          </div>
          <ErrorText>{vaccError}</ErrorText>
        </form>
      </Modal>

      <Modal
        open={wormOpen}
        title={wormEditingId ? '修改驱虫记录' : '添加驱虫记录'}
        onClose={closeWorm}
        footer={
          <>
            <button type="button" className={btnGhost} onClick={closeWorm} disabled={wormBusy}>
              取消
            </button>
            <button type="submit" form="worm-form" className={btnPrimary} disabled={wormBusy}>
              {wormBusy ? '保存中…' : '保存'}
            </button>
          </>
        }
      >
        <form id="worm-form" onSubmit={submitWorm} className="space-y-3">
          <Field label="驱虫类型" required>
            <input className={inputCls} value={wormForm.type} onChange={(e) => setWormForm((p) => ({ ...p, type: e.target.value }))} placeholder="例如：体内驱虫 / 体外驱虫" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="驱虫日期" required>
              <input type="date" className={inputCls} value={wormForm.date} onChange={(e) => setWormForm((p) => ({ ...p, date: e.target.value }))} />
            </Field>
            <Field label="下次到期日期">
              <input type="date" className={inputCls} value={wormForm.next_due_date} onChange={(e) => setWormForm((p) => ({ ...p, next_due_date: e.target.value }))} />
            </Field>
          </div>
          <Field label="备注">
            <input className={inputCls} value={wormForm.note} onChange={(e) => setWormForm((p) => ({ ...p, note: e.target.value }))} />
          </Field>
          <ErrorText>{wormError}</ErrorText>
        </form>
      </Modal>
    </div>
  );
}
