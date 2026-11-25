import { useEffect, useRef, useState } from 'react';
import { api } from '../../api';
import ImageDropzone from '../../components/ImageDropzone';
import ImageViewer from '../../components/ImageViewer';
import {
  btnGhost,
  Card,
  Empty,
  ErrorText,
  Field,
  inputCls,
  SectionTitle
} from '../../components/ui';
import { fmtDate } from '../../utils';
import type { PetDetailData, Photo } from '../../types';

interface PhotoItem {
  key: string;
  file: File;
  preview: string;
  caption: string;
  status: 'ready' | 'uploading' | 'error';
  error?: string;
}

const MAX_BATCH = 10;

export default function PhotosTab({
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
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [recentIds, setRecentIds] = useState<number[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const uploadRef = useRef<HTMLDivElement>(null);
  const savedRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    if (openNew) uploadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [openNew]);

  useEffect(() => {
    if (!highlight) return;
    const el = document.getElementById(highlight);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlight]);

  useEffect(
    () => () => {
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.preview));
    },
    []
  );

  const addFiles = (files: File[]) => {
    if (files.length === 0) return;
    const created = files.map((file) => ({
      key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
      caption: '',
      status: 'ready' as const
    }));
    setItems((prev) => [...prev, ...created]);
    setError('');
    setSuccess('');
  };

  const removeItem = (key: string) => {
    setItems((prev) => {
      const target = prev.find((item) => item.key === key);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((item) => item.key !== key);
    });
  };

  const setCaption = (key: string, caption: string) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, caption } : item)));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (items.length === 0) {
      setError('请先选择要上传的照片');
      return;
    }
    setBusy(true);
    const createdIds: number[] = [];
    let failed = 0;
    let firstError = '';
    try {
      for (const item of items.filter((row) => row.status !== 'uploading')) {
        setItems((prev) =>
          prev.map((row) => (row.key === item.key ? { ...row, status: 'uploading', error: undefined } : row))
        );
        try {
          const fd = new FormData();
          fd.append('file', item.file);
          fd.append('caption', item.caption);
          fd.append('tags', tags);
          const res = await api<{ record: Photo }>(`/pets/${petId}/photos`, { method: 'POST', form: fd });
          createdIds.push(res.record.id);
          setItems((prev) => prev.filter((row) => row.key !== item.key));
          URL.revokeObjectURL(item.preview);
        } catch (err) {
          failed += 1;
          const message = err instanceof Error ? err.message : '上传失败';
          if (!firstError) firstError = message;
          setItems((prev) =>
            prev.map((row) => (row.key === item.key ? { ...row, status: 'error', error: message } : row))
          );
        }
      }

      if (createdIds.length > 0) {
        setRecentIds((prev) => Array.from(new Set([...prev, ...createdIds])));
        await reload();
        window.setTimeout(() => savedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
      }

      if (failed > 0) {
        setSuccess('');
        setError(
          `${createdIds.length} 张已保存，${failed} 张上传失败（${firstError}）。失败的照片和说明都还在，可以只重试失败的。`
        );
      } else {
        setSuccess(
          `${createdIds.length} 张照片已保存。下方相册最前面已用「刚刚上传」标出，可以继续查看大图或补传说明。`
        );
        setTags('');
        setItems([]);
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async (photo: Photo) => {
    if (!window.confirm('确定删除这张生活照吗？')) return;
    try {
      await api(`/pets/${petId}/photos/${photo.id}`, { method: 'DELETE' });
      await reload();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const viewerImages = data.photos.map((photo) => ({
    src: photo.file_path,
    alt: photo.caption || '生活照',
    caption: photo.caption || '生活照',
    date: fmtDate(photo.created_at)
  }));

  const failedCount = items.filter((item) => item.status === 'error').length;
  const pendingCount = items.filter((item) => item.status !== 'uploading').length;

  return (
    <div className="space-y-4">
      <Card>
        <div ref={uploadRef}>
          <SectionTitle action={<span className="text-xs text-slate-400">本次新选择 · 尚未保存</span>}>
            上传生活照
          </SectionTitle>
          <p className="mb-3 rounded-xl bg-teal-50/70 px-3 py-2 text-xs leading-5 text-teal-800">
            可以一次选多张，每张都能单独写说明、预览或移除。点击上传后逐张保存，成功和失败会分别标出；失败的照片不会重复上传成功的那些。
          </p>
          <form onSubmit={submit} className="space-y-4">
            <ImageDropzone
              multiple
              maxFiles={Math.max(1, MAX_BATCH - items.length)}
              disabled={busy || items.length >= MAX_BATCH}
              onFiles={addFiles}
              title={
                items.length >= MAX_BATCH
                  ? `本次已选满 ${MAX_BATCH} 张，移除后可继续添加`
                  : '把它的可爱瞬间拖进来，或点击选择多张'
              }
              hint={`支持 JPG / PNG / WEBP，单张不超过 5MB，一次最多 ${MAX_BATCH} 张`}
            />

            {items.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500">
                  已选择 {items.length} 张（上传前可逐张改说明或移除）
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {items.map((item) => (
                    <div key={item.key} className="flex gap-2.5 rounded-xl border border-slate-200 p-2">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        <img src={item.preview} alt={item.file.name} className="h-full w-full object-cover" />
                        <span
                          className={`absolute left-1 top-1 rounded px-1.5 py-0.5 text-[10px] text-white ${
                            item.status === 'error'
                              ? 'bg-red-600/90'
                              : item.status === 'uploading'
                                ? 'bg-amber-500/90'
                                : 'bg-slate-700/75'
                          }`}
                        >
                          {item.status === 'error' ? '上传失败' : item.status === 'uploading' ? '上传中…' : '待上传'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs text-slate-500" title={item.file.name}>
                            {item.file.name} · {(item.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          {item.status !== 'uploading' && (
                            <button
                              type="button"
                              onClick={() => removeItem(item.key)}
                              className="shrink-0 text-xs text-slate-400 hover:text-red-600"
                            >
                              移除
                            </button>
                          )}
                        </div>
                        <input
                          className={`${inputCls} mt-1.5`}
                          value={item.caption}
                          onChange={(e) => setCaption(item.key, e.target.value)}
                          placeholder="这张照片的说明，例如：第一次洗澡"
                          maxLength={200}
                          disabled={busy || item.status === 'uploading'}
                        />
                        {item.status === 'error' && item.error && (
                          <p className="mt-1 text-[11px] text-red-600">{item.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Field label="标签（本次全部照片共用）">
              <input
                className={inputCls}
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="逗号分隔，如：日常,玩耍"
                maxLength={100}
                disabled={busy}
              />
            </Field>

            <ErrorText>{error}</ErrorText>
            {success && <p className="rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-800">{success}</p>}
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy || pendingCount === 0}
            >
              {busy
                ? '上传中…'
                : failedCount > 0 && failedCount === pendingCount
                  ? `重试失败照片（${failedCount}）`
                  : items.length > 0
                    ? `上传 ${pendingCount} 张生活照`
                    : '上传生活照'}
            </button>
            <p className="text-xs text-slate-400">支持点击选择或把多张图片拖入上方区域；失败的照片会保留，可直接重试。</p>
          </form>
        </div>
      </Card>

      <Card>
        <div ref={savedRef}>
          <SectionTitle action={<span className="text-xs text-slate-400">已保存</span>}>
            已保存的生活照（{data.photos.length}）
          </SectionTitle>
          {data.photos.length === 0 ? (
            <Empty text="还没有已保存的生活照，上传一张记录它的日常吧" />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {data.photos.map((photo, index) => {
                const isRecent = recentIds.includes(photo.id);
                return (
                  <figure
                    key={photo.id}
                    id={`photo-${photo.id}`}
                    className={`group overflow-hidden rounded-xl border bg-white ${
                      isRecent
                        ? 'border-teal-400 ring-2 ring-teal-200'
                        : highlight === `photo-${photo.id}`
                          ? 'border-slate-200 ring-2 ring-teal-300'
                          : 'border-slate-200'
                    }`}
                  >
                    <button type="button" className="relative block w-full" onClick={() => setViewerIndex(index)}>
                      <img
                        src={photo.file_path}
                        alt={photo.caption || '生活照'}
                        className="aspect-square w-full object-cover transition group-hover:opacity-90"
                      />
                      {isRecent && (
                        <span className="absolute left-2 top-2 rounded-full bg-teal-600 px-2 py-0.5 text-[11px] font-medium text-white shadow">
                          刚刚上传
                        </span>
                      )}
                    </button>
                    <figcaption className="space-y-1 p-2">
                      {photo.caption && <p className="text-sm text-slate-700">{photo.caption}</p>}
                      <div className="flex flex-wrap items-center gap-1">
                        {(photo.tags || '')
                          .split(',')
                          .map((t) => t.trim())
                          .filter(Boolean)
                          .map((tag) => (
                            <span key={tag} className="rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-700">
                              {tag}
                            </span>
                          ))}
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>保存于 {fmtDate(photo.created_at)}</span>
                        <div className="flex items-center gap-2">
                          <button type="button" className="text-xs text-teal-700 hover:text-teal-900" onClick={() => setViewerIndex(index)}>
                            查看大图
                          </button>
                          <button type="button" className={btnGhost} onClick={() => remove(photo)}>
                            删除
                          </button>
                        </div>
                      </div>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <ImageViewer
        images={viewerImages}
        index={viewerIndex}
        onClose={() => setViewerIndex(null)}
        onIndexChange={setViewerIndex}
      />
    </div>
  );
}
