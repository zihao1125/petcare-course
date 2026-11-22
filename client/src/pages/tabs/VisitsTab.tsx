import { useState } from 'react';
import { api } from '../../api';
import ImageDropzone from '../../components/ImageDropzone';
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
import { dateError, fmtDate, fmtMoney, today } from '../../utils';
import type { PetDetailData, Visit } from '../../types';

const emptyForm = {
  visit_date: today(),
  hospital: '',
  doctor: '',
  department: '',
  chief_complaint: '',
  diagnosis: '',
  prescription: '',
  cost: '',
  followup_date: '',
  note: ''
};

export default function VisitsTab({
  petId,
  data,
  reload
}: {
  petId: number;
  data: PetDetailData;
  reload: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const set = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.visit_date) {
      setError('请选择就诊日期');
      return;
    }
    const dateMsg = dateError(form.visit_date, '就诊日期', true) || dateError(form.followup_date, '复诊日期');
    if (dateMsg) {
      setError(dateMsg);
      return;
    }
    setBusy(true);
    try {
      await api(`/pets/${petId}/visits`, {
        method: 'POST',
        body: {
          ...form,
          followup_date: form.followup_date || null,
          cost: form.cost === '' ? null : Number(form.cost)
        }
      });
      setForm({ ...emptyForm, visit_date: today() });
      setOpen(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (visit: Visit) => {
    if (!window.confirm(`确定删除 ${visit.visit_date} 的就诊记录吗？报告图片也会一起删除。`)) return;
    try {
      await api(`/pets/${petId}/visits/${visit.id}`, { method: 'DELETE' });
      await reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const upload = async (visitId: number, files: File[]) => {
    if (files.length === 0) return;
    setUploadingId(visitId);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));
      await api(`/pets/${petId}/visits/${visitId}/images`, { method: 'POST', form: fd });
      await reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploadingId(null);
    }
  };

  const removeImage = async (visitId: number, imageId: number) => {
    if (!window.confirm('确定删除这张报告图片吗？')) return;
    try {
      await api(`/pets/${petId}/visits/${visitId}/images/${imageId}`, { method: 'DELETE' });
      await reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle action={<button type="button" className={btnPrimary} onClick={() => setOpen(true)}>＋ 添加就医记录</button>}>
          就医记录
        </SectionTitle>
        {data.visits.length === 0 ? (
          <Empty text="暂无就医记录" />
        ) : (
          <div className="space-y-4">
            {data.visits.map((visit) => (
              <article key={visit.id} className="rounded-xl border border-slate-200 p-3 md:p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {fmtDate(visit.visit_date)}
                      {visit.hospital ? ` · ${visit.hospital}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {[visit.department, visit.doctor && `医生：${visit.doctor}`].filter(Boolean).join(' · ') || '未填写科室/医生'}
                    </p>
                  </div>
                  <button type="button" className={btnGhost} onClick={() => remove(visit)}>
                    删除
                  </button>
                </div>

                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  {visit.chief_complaint && (
                    <div>
                      <dt className="text-xs text-slate-400">主诉</dt>
                      <dd className="text-slate-700">{visit.chief_complaint}</dd>
                    </div>
                  )}
                  {visit.diagnosis && (
                    <div>
                      <dt className="text-xs text-slate-400">诊断</dt>
                      <dd className="text-slate-700">{visit.diagnosis}</dd>
                    </div>
                  )}
                  {visit.prescription && (
                    <div>
                      <dt className="text-xs text-slate-400">处方</dt>
                      <dd className="text-slate-700">{visit.prescription}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs text-slate-400">费用</dt>
                    <dd className="text-slate-700">{fmtMoney(visit.cost)}</dd>
                  </div>
                  {visit.followup_date && (
                    <div>
                      <dt className="text-xs text-slate-400">复诊日期</dt>
                      <dd className="text-slate-700">{fmtDate(visit.followup_date)}</dd>
                    </div>
                  )}
                  {visit.note && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-slate-400">备注</dt>
                      <dd className="text-slate-700">{visit.note}</dd>
                    </div>
                  )}
                </dl>

                <div className="mt-3">
                  <p className="mb-2 text-xs font-medium text-slate-500">检查报告（{visit.images?.length || 0}）</p>
                  {visit.images && visit.images.length > 0 && (
                    <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {visit.images.map((img) => (
                        <div key={img.id} className="group relative overflow-hidden rounded-lg border border-slate-200">
                          <a href={img.file_path} target="_blank" rel="noreferrer">
                            <img src={img.file_path} alt="检查报告" className="h-24 w-full object-cover" />
                          </a>
                          <button
                            type="button"
                            onClick={() => removeImage(visit.id, img.id)}
                            className="absolute right-1 top-1 rounded-md bg-slate-900/60 px-1.5 py-0.5 text-xs text-white"
                          >
                            删除
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <ImageDropzone
                    compact
                    multiple
                    maxFiles={6}
                    disabled={uploadingId === visit.id}
                    title={uploadingId === visit.id ? '上传中…' : '拖拽检查报告到这里，或点击选择'}
                    hint="支持 JPG / PNG / WEBP，单张不超过 5MB，一次最多 6 张"
                    onFiles={(files) => upload(visit.id, files)}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={open}
        title="添加就医记录"
        onClose={() => setOpen(false)}
        wide
        footer={
          <>
            <button type="button" className={btnGhost} onClick={() => setOpen(false)} disabled={busy}>
              取消
            </button>
            <button type="submit" form="visit-form" className={btnPrimary} disabled={busy}>
              {busy ? '保存中…' : '保存'}
            </button>
          </>
        }
      >
        <form id="visit-form" onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Field label="就诊日期" required>
            <input type="date" className={inputCls} value={form.visit_date} onChange={(e) => set('visit_date', e.target.value)} />
          </Field>
          <Field label="医院">
            <input className={inputCls} value={form.hospital} onChange={(e) => set('hospital', e.target.value)} />
          </Field>
          <Field label="医生">
            <input className={inputCls} value={form.doctor} onChange={(e) => set('doctor', e.target.value)} />
          </Field>
          <Field label="科室">
            <input className={inputCls} value={form.department} onChange={(e) => set('department', e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="主诉">
              <textarea className={inputCls} rows={2} value={form.chief_complaint} onChange={(e) => set('chief_complaint', e.target.value)} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="诊断">
              <textarea className={inputCls} rows={2} value={form.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="处方">
              <textarea className={inputCls} rows={2} value={form.prescription} onChange={(e) => set('prescription', e.target.value)} />
            </Field>
          </div>
          <Field label="费用（元）">
            <input type="number" step="0.01" min="0" className={inputCls} value={form.cost} onChange={(e) => set('cost', e.target.value)} />
          </Field>
          <Field label="复诊日期">
            <input type="date" className={inputCls} value={form.followup_date} onChange={(e) => set('followup_date', e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="备注">
              <textarea className={inputCls} rows={2} value={form.note} onChange={(e) => set('note', e.target.value)} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <ErrorText>{error}</ErrorText>
            <p className="mt-1 text-xs text-slate-400">保存后可在记录卡片中上传检查报告图片</p>
          </div>
        </form>
      </Modal>
    </div>
  );
}
