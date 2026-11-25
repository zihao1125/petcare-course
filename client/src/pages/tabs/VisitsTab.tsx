import { useEffect, useState } from 'react';
import { api } from '../../api';
import ImageDropzone from '../../components/ImageDropzone';
import ImageViewer from '../../components/ImageViewer';
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
import type { PetDetailData, Visit, VisitImage } from '../../types';

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

interface LocalImage {
  key: string;
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'error';
  error?: string;
}

function visitToForm(visit: Visit) {
  return {
    visit_date: visit.visit_date,
    hospital: visit.hospital || '',
    doctor: visit.doctor || '',
    department: visit.department || '',
    chief_complaint: visit.chief_complaint || '',
    diagnosis: visit.diagnosis || '',
    prescription: visit.prescription || '',
    cost: visit.cost == null ? '' : String(visit.cost),
    followup_date: visit.followup_date || '',
    note: visit.note || ''
  };
}

export default function VisitsTab({
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
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [moreOpen, setMoreOpen] = useState(false);
  const [localImages, setLocalImages] = useState<LocalImage[]>([]);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [viewer, setViewer] = useState<{ visitId: number; index: number } | null>(null);

  useEffect(() => {
    if (openNew) openNewDialog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNew]);

  useEffect(() => {
    if (!highlight) return;
    const el = document.getElementById(highlight);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlight]);

  const highlightCls = (key: string) =>
    highlight === key ? 'ring-2 ring-teal-300 bg-teal-50/50' : '';

  const viewerVisit = viewer ? data.visits.find((v) => v.id === viewer.visitId) : null;
  const viewerImages = (viewerVisit?.images || []).map((img) => ({
    src: img.file_path,
    alt: '检查报告',
    caption: `${viewerVisit?.hospital || '就医记录'}${viewerVisit?.visit_date ? ` · ${viewerVisit.visit_date}` : ''}`,
    date: viewerVisit?.visit_date || '',
    downloadUrl: `${img.file_path}?download=1`,
    downloadName: `report-${img.id}.jpg`
  }));

  const savedVisit = savedId ? data.visits.find((v) => v.id === savedId) : null;
  const savedImages = savedVisit?.images || [];

  const set = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const releaseImages = (images: LocalImage[]) => {
    images.forEach((item) => URL.revokeObjectURL(item.preview));
  };

  const resetDialog = () => {
    releaseImages(localImages);
    setLocalImages([]);
    setEditingId(null);
    setSavedId(null);
    setForm({ ...emptyForm, visit_date: today() });
    setMoreOpen(false);
    setError('');
    setSummary('');
  };

  const openNewDialog = () => {
    resetDialog();
    setNotice('');
    setOpen(true);
  };

  const openEditDialog = (visit: Visit) => {
    resetDialog();
    setNotice('');
    setEditingId(visit.id);
    setSavedId(visit.id);
    setForm(visitToForm(visit));
    setMoreOpen(
      !!(
        visit.doctor ||
        visit.department ||
        visit.prescription ||
        visit.cost != null ||
        visit.followup_date ||
        visit.note
      )
    );
    setOpen(true);
  };

  const closeDialog = () => {
    if (localImages.some((item) => item.status === 'error')) {
      if (
        !window.confirm(
          '就诊记录已经保存，但还有报告图片没有上传成功。关闭后要回到记录卡片里重新添加，确定关闭吗？'
        )
      ) {
        return;
      }
    }
    setOpen(false);
    resetDialog();
  };

  const addLocalImages = (files: File[]) => {
    if (files.length === 0) return;
    const items: LocalImage[] = files.map((file) => ({
      key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending'
    }));
    setLocalImages((prev) => [...prev, ...items]);
    setError('');
  };

  const removeLocalImage = (key: string) => {
    setLocalImages((prev) => {
      const target = prev.find((item) => item.key === key);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((item) => item.key !== key);
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSummary('');
    setNotice('');
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
      const payload = {
        ...form,
        followup_date: form.followup_date || null,
        cost: form.cost === '' ? null : Number(form.cost)
      };
      let visitId = savedId;
      if (!visitId) {
        const created = await api<{ record: Visit }>(`/pets/${petId}/visits`, { method: 'POST', body: payload });
        visitId = created.record.id;
        setSavedId(visitId);
      } else {
        await api(`/pets/${petId}/visits/${visitId}`, { method: 'PUT', body: payload });
      }

      const queue = localImages.filter((item) => item.status !== 'uploading');
      let uploaded = 0;
      let failed = 0;
      let firstError = '';
      for (const item of queue) {
        setLocalImages((prev) =>
          prev.map((row) => (row.key === item.key ? { ...row, status: 'uploading', error: undefined } : row))
        );
        try {
          const fd = new FormData();
          fd.append('files', item.file);
          await api(`/pets/${petId}/visits/${visitId}/images`, { method: 'POST', form: fd });
          uploaded += 1;
          setLocalImages((prev) => prev.filter((row) => row.key !== item.key));
          URL.revokeObjectURL(item.preview);
        } catch (err) {
          failed += 1;
          const message = err instanceof Error ? err.message : '上传失败';
          if (!firstError) firstError = message;
          setLocalImages((prev) =>
            prev.map((row) => (row.key === item.key ? { ...row, status: 'error', error: message } : row))
          );
        }
      }

      await reload();
      if (failed > 0) {
        setSummary(
          `就诊记录已保存；本次 ${uploaded} 张报告已上传，${failed} 张失败（${firstError}）。已填写的内容和新选择的图片都还在，可以只重试失败的图片。`
        );
      } else {
        setOpen(false);
        resetDialog();
        setNotice(
          uploaded > 0
            ? `就医记录已保存，${uploaded} 张检查报告一起上传完成，可在下方记录卡片查看。`
            : '就医记录已保存，本次没有添加检查报告。'
        );
      }
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
    if (!window.confirm('确定删除这张已保存的报告图片吗？删除后立即生效。')) return;
    try {
      await api(`/pets/${petId}/visits/${visitId}/images/${imageId}`, { method: 'DELETE' });
      await reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const removeSavedImage = async (visitId: number, image: VisitImage) => {
    await removeImage(visitId, image.id);
  };

  const totalImages = savedImages.length + localImages.length;
  const failedCount = localImages.filter((item) => item.status === 'error').length;
  const submitLabel = busy
    ? '保存中…'
    : failedCount > 0
      ? `重试失败图片（${failedCount}）`
      : editingId
        ? '保存修改'
        : '保存记录';

  return (
    <div className="space-y-4">
      {notice && (
        <p className="rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-800 ring-1 ring-teal-100">{notice}</p>
      )}
      <Card>
        <SectionTitle action={<button type="button" className={btnPrimary} onClick={openNewDialog}>＋ 添加就医记录</button>}>
          就医记录
        </SectionTitle>
        {data.visits.length === 0 ? (
          <Empty text="暂无就医记录" />
        ) : (
          <div className="space-y-4">
            {data.visits.map((visit) => (
              <article
                key={visit.id}
                id={`visit-${visit.id}`}
                className={`rounded-xl border border-slate-200 p-3 md:p-4 ${highlightCls(`visit-${visit.id}`)}`}
              >
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
                  <div className="flex items-center gap-3">
                    <button type="button" className={btnGhost} onClick={() => openEditDialog(visit)}>
                      编辑
                    </button>
                    <button type="button" className={btnGhost} onClick={() => remove(visit)}>
                      删除
                    </button>
                  </div>
                </div>

                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  {visit.chief_complaint && (
                    <div>
                      <dt className="text-xs text-slate-400">主要情况（主诉）</dt>
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
                  <p className="mb-2 text-xs font-medium text-slate-500">
                    检查报告（{visit.images?.length || 0}）· 点击图片查看大图，可在查看器中下载
                  </p>
                  {visit.images && visit.images.length > 0 && (
                    <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {visit.images.map((img, idx) => (
                        <div key={img.id} className="group relative overflow-hidden rounded-lg border border-slate-200">
                          <button
                            type="button"
                            className="block w-full"
                            onClick={() => setViewer({ visitId: visit.id, index: idx })}
                          >
                            <img
                              src={img.file_path}
                              alt="检查报告"
                              className="h-24 w-full object-cover transition group-hover:opacity-85"
                            />
                          </button>
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
                    title={uploadingId === visit.id ? '上传中…' : '补充报告：拖拽到这里，或点击选择'}
                    hint="支持 JPG / PNG / WEBP，单张不超过 5MB，一次最多 6 张"
                    onFiles={(files) => upload(visit.id, files)}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Modal open={open} title={editingId ? '编辑就医记录' : '添加就医记录'} onClose={() => { if (!busy) closeDialog(); }} wide
        footer={
          <>
            <button type="button" className={btnGhost} onClick={closeDialog} disabled={busy}>
              {savedId && failedCount > 0 ? '关闭（记录已保存）' : '取消'}
            </button>
            <button type="submit" form="visit-form" className={btnPrimary} disabled={busy}>
              {submitLabel}
            </button>
          </>
        }
      >
        <form id="visit-form" onSubmit={submit} className="space-y-3">
          {summary && (
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-800 ring-1 ring-amber-100">
              {summary}
            </div>
          )}
          <ErrorText>{error}</ErrorText>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="就诊日期" required>
              <input type="date" className={inputCls} value={form.visit_date} onChange={(e) => set('visit_date', e.target.value)} />
            </Field>
            <Field label="医院">
              <input
                className={inputCls}
                value={form.hospital}
                onChange={(e) => set('hospital', e.target.value)}
                placeholder="例如：××宠物医院"
              />
            </Field>
          </div>

          <Field
            label="主要情况（主诉）"
            hint="用大白话说它哪里不舒服、从什么时候开始，例如「呕吐两天、不太吃东西」。"
          >
            <textarea
              className={inputCls}
              rows={2}
              value={form.chief_complaint}
              onChange={(e) => set('chief_complaint', e.target.value)}
              placeholder="例如：昨天开始呕吐两次，今天不太想吃东西"
            />
          </Field>

          <Field label="诊断" hint="医生给出的病名或结论，例如「急性肠胃炎」。">
            <textarea
              className={inputCls}
              rows={2}
              value={form.diagnosis}
              onChange={(e) => set('diagnosis', e.target.value)}
              placeholder="医生怎么说"
            />
          </Field>

          <section className="rounded-xl border border-slate-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-700">检查报告图片（选填）</p>
              <span className="text-xs text-slate-400">{totalImages} / 6 张</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              化验单、B 超、处方单都可以拍照上传，可一次选多张；保存记录时一起上传，没有报告也能直接保存。
            </p>

            {(savedImages.length > 0 || localImages.length > 0) && (
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {savedId &&
                  savedImages.map((img) => (
                    <div key={`saved-${img.id}`} className="relative overflow-hidden rounded-lg border border-teal-200">
                      <img src={img.file_path} alt="已保存的检查报告" className="h-20 w-full object-cover" />
                      <span className="absolute left-1 top-1 rounded bg-teal-600/85 px-1.5 py-0.5 text-[10px] text-white">
                        已保存
                      </span>
                      <button
                        type="button"
                        onClick={() => savedId && removeSavedImage(savedId, img)}
                        className="absolute bottom-1 right-1 rounded bg-slate-900/65 px-1.5 py-0.5 text-[10px] text-white"
                      >
                        移除
                      </button>
                    </div>
                  ))}
                {localImages.map((item) => (
                  <div key={item.key} className="relative overflow-hidden rounded-lg border border-slate-200">
                    <img src={item.preview} alt={item.file.name} className="h-20 w-full object-cover" />
                    <span
                      className={`absolute left-1 top-1 rounded px-1.5 py-0.5 text-[10px] text-white ${
                        item.status === 'error'
                          ? 'bg-red-600/90'
                          : item.status === 'uploading'
                            ? 'bg-amber-500/90'
                            : 'bg-slate-700/80'
                      }`}
                    >
                      {item.status === 'error' ? '上传失败' : item.status === 'uploading' ? '上传中…' : '待上传'}
                    </span>
                    {item.status !== 'uploading' && (
                      <button
                        type="button"
                        onClick={() => removeLocalImage(item.key)}
                        className="absolute bottom-1 right-1 rounded bg-slate-900/65 px-1.5 py-0.5 text-[10px] text-white"
                      >
                        移除
                      </button>
                    )}
                    {item.status === 'error' && item.error && (
                      <p className="bg-red-50 px-1.5 py-1 text-[10px] leading-3 text-red-600">{item.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {totalImages < 6 ? (
              <div className="mt-2">
                <ImageDropzone
                  compact
                  multiple
                  maxFiles={6 - totalImages}
                  disabled={busy}
                  title="选择检查报告图片"
                  hint={`还能再选 ${6 - totalImages} 张；支持 JPG / PNG / WEBP，单张不超过 5MB`}
                  onFiles={addLocalImages}
                />
              </div>
            ) : (
              <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-500">
                已达到 6 张上限，移除后可继续添加。
              </p>
            )}
          </section>

          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            <span>{moreOpen ? '收起更多信息' : '更多信息（医生、科室、费用、处方、复诊日期、备注）'}</span>
            <span className="text-xs text-slate-400">{moreOpen ? '▲' : '▼'}</span>
          </button>

          {moreOpen && (
            <div className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
              <Field label="医生">
                <input className={inputCls} value={form.doctor} onChange={(e) => set('doctor', e.target.value)} />
              </Field>
              <Field label="科室">
                <input className={inputCls} value={form.department} onChange={(e) => set('department', e.target.value)} placeholder="例如：内科" />
              </Field>
              <Field label="费用（元）" hint="这次看病一共花了多少，选填。">
                <input type="number" step="0.01" min="0" className={inputCls} value={form.cost} onChange={(e) => set('cost', e.target.value)} placeholder="例如：268.5" />
              </Field>
              <Field label="复诊日期" hint="医生建议下次复查的日期；填了会出现在首页提醒里。">
                <input type="date" className={inputCls} value={form.followup_date} onChange={(e) => set('followup_date', e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="处方" hint="医生开的药或治疗方式，例如「益生菌，每天一次，连用 5 天」。">
                  <textarea className={inputCls} rows={2} value={form.prescription} onChange={(e) => set('prescription', e.target.value)} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="备注" hint="其他想记的事，例如下次要带的东西。">
                  <textarea className={inputCls} rows={2} value={form.note} onChange={(e) => set('note', e.target.value)} />
                </Field>
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-400">保存时会先保存记录，再逐张上传检查报告；没有报告也可以直接保存。</p>
        </form>
      </Modal>

      <ImageViewer
        images={viewerImages}
        index={viewer?.index ?? null}
        onClose={() => setViewer(null)}
        onIndexChange={(i) => setViewer((v) => (v ? { ...v, index: i } : v))}
      />
    </div>
  );
}
