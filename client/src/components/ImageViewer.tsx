import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface ViewerImage {
  src: string;
  alt?: string;
  caption?: string;
  date?: string;
  downloadUrl?: string;
  downloadName?: string;
}

interface Props {
  images: ViewerImage[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export default function ImageViewer({ images, index, onClose, onIndexChange }: Props) {
  const open = index !== null && index >= 0 && index < images.length;

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onIndexChange((index! - 1 + images.length) % images.length);
      if (event.key === 'ArrowRight') onIndexChange((index! + 1) % images.length);
    };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', handler);
    };
  }, [open, index, images.length, onClose, onIndexChange]);

  if (!open) return null;
  const current = images[index!];

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-[#160f0a]/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="查看图片"
      onClick={onClose}
    >
      <div
        className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3 text-white md:px-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{current.caption || current.alt || '查看图片'}</p>
          <p className="mt-0.5 text-xs text-white/50">
            {current.date || ''}
            {images.length > 1 ? ` · 第 ${index! + 1} / ${images.length} 张` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {current.downloadUrl && (
            <a
              href={current.downloadUrl}
              download={current.downloadName || 'attachment'}
              className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/25"
              onClick={(e) => e.stopPropagation()}
            >
              下载原图
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-orange-50"
          >
            返回记录
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 py-4" onClick={(e) => e.stopPropagation()}>
        {images.length > 1 && (
          <button
            type="button"
            aria-label="上一张"
            onClick={() => onIndexChange((index! - 1 + images.length) % images.length)}
            className="absolute left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl text-white transition hover:bg-white/25 md:left-6"
          >
            ‹
          </button>
        )}
        <img
          src={current.src}
          alt={current.alt || current.caption || '图片'}
          className="max-h-[76vh] max-w-full rounded-xl object-contain shadow-2xl"
        />
        {images.length > 1 && (
          <button
            type="button"
            aria-label="下一张"
            onClick={() => onIndexChange((index! + 1) % images.length)}
            className="absolute right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl text-white transition hover:bg-white/25 md:right-6"
          >
            ›
          </button>
        )}
      </div>

      <p className="border-t border-white/10 px-4 py-2 text-center text-xs text-white/40 md:px-6">
        点击空白处、按 Esc 或「返回记录」关闭
      </p>
    </div>,
    document.body
  );
}
