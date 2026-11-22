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
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const uploadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (openNew) uploadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [openNew]);

  useEffect(() => {
    if (!highlight) return;
    const el = document.getElementById(highlight);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlight]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!file) {
      setError('请选择要上传的照片');
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('caption', caption);
      fd.append('tags', tags);
      await api(`/pets/${petId}/photos`, { method: 'POST', form: fd });
      setFile(null);
      setCaption('');
      setTags('');
      setSuccess('已保存，下方「已保存的生活照」中可以看到这张图片。');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败，请重试');
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

  return (
    <div className="space-y-4">
      <Card>
        <div ref={uploadRef}>
          <SectionTitle action={<span className="text-xs text-slate-400">本次新选择 · 尚未保存</span>}>
            上传生活照
          </SectionTitle>
          <p className="mb-3 rounded-xl bg-teal-50/70 px-3 py-2 text-xs leading-5 text-teal-800">
            本次选择的图片需要点击「上传这张生活照」后才会保存；下方「已保存的生活照」是已经入库的图片。
          </p>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <ImageDropzone
              onFiles={(files) => {
                setFile(files[0]);
                setError('');
                setSuccess('');
              }}
              preview={preview || undefined}
              onClear={() => setFile(null)}
              title="把它的可爱瞬间拖进来"
              hint="支持 JPG / PNG / WEBP，单张不超过 5MB"
              previewAlt="生活照预览"
              previewLabel="本次新选择的图片（尚未保存）"
            />
            <div className="flex flex-col gap-3">
              <Field label="文字说明">
                <input
                  className={inputCls}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="例如：第一次洗澡"
                  maxLength={200}
                />
              </Field>
              <Field label="标签">
                <input
                  className={inputCls}
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="逗号分隔，如：日常,玩耍"
                  maxLength={100}
                />
              </Field>
              {file && (
                <p className="truncate text-xs text-slate-500">
                  已选择：{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
              <ErrorText>{error}</ErrorText>
              {success && <p className="rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-800">{success}</p>}
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={busy || !file}
              >
                {busy ? '上传中…' : error ? '重试上传' : '上传这张生活照'}
              </button>
              <p className="text-xs text-slate-400">支持点击选择或把图片拖入左侧区域；失败后文件会保留，可直接重试。</p>
            </div>
          </form>
        </div>
      </Card>

      <Card>
        <SectionTitle action={<span className="text-xs text-slate-400">已保存</span>}>
          已保存的生活照（{data.photos.length}）
        </SectionTitle>
        {data.photos.length === 0 ? (
          <Empty text="还没有已保存的生活照，上传一张记录它的日常吧" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data.photos.map((photo, index) => (
              <figure
                key={photo.id}
                id={`photo-${photo.id}`}
                className={`group overflow-hidden rounded-xl border border-slate-200 bg-white ${
                  highlight === `photo-${photo.id}` ? 'ring-2 ring-teal-300' : ''
                }`}
              >
                <button type="button" className="block w-full" onClick={() => setViewerIndex(index)}>
                  <img
                    src={photo.file_path}
                    alt={photo.caption || '生活照'}
                    className="aspect-square w-full object-cover transition group-hover:opacity-90"
                  />
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
            ))}
          </div>
        )}
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
