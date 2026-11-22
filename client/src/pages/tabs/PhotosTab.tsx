import { useRef, useState } from 'react';
import { api } from '../../api';
import {
  btnGhost,
  btnPrimary,
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
  reload
}: {
  petId: number;
  data: PetDetailData;
  reload: () => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
      if (fileInputRef.current) fileInputRef.current.value = '';
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
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

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>上传生活照</SectionTitle>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <Field label="图片" required>
            <input
              id="photo-file"
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="w-full text-sm text-slate-600"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </Field>
          <Field label="文字说明">
            <input className={inputCls} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="例如：第一次洗澡" />
          </Field>
          <Field label="标签">
            <input className={inputCls} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="逗号分隔，如：日常,玩耍" />
          </Field>
          <button type="submit" className={btnPrimary} disabled={busy}>
            {busy ? '上传中…' : '上传'}
          </button>
        </form>
        <ErrorText>{error}</ErrorText>
      </Card>

      <Card>
        <SectionTitle>相册（{data.photos.length}）</SectionTitle>
        {data.photos.length === 0 ? (
          <Empty text="还没有生活照，上传一张记录它的日常吧" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data.photos.map((photo) => (
              <figure key={photo.id} className="group overflow-hidden rounded-xl border border-slate-200 bg-white">
                <a href={photo.file_path} target="_blank" rel="noreferrer">
                  <img src={photo.file_path} alt={photo.caption || '生活照'} className="aspect-square w-full object-cover" />
                </a>
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
                    <span>{fmtDate(photo.created_at)}</span>
                    <button type="button" className={btnGhost} onClick={() => remove(photo)}>
                      删除
                    </button>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
