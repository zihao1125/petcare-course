import { useRef, useState } from 'react';
import { fileListToArray, IMAGE_ACCEPT, validateImageFiles } from '../upload';

interface Props {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  maxFiles?: number;
  preview?: string;
  onClear?: () => void;
  disabled?: boolean;
  title?: string;
  hint?: string;
  compact?: boolean;
  previewAlt?: string;
  previewLabel?: string;
  className?: string;
}

function ImageIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m4.5 17.5 4.8-4.6a1.6 1.6 0 0 1 2.2 0l2.2 2.1a1.6 1.6 0 0 0 2.2 0l1.5-1.4 2.1 2" />
    </svg>
  );
}

export default function ImageDropzone({
  onFiles,
  multiple = false,
  maxFiles = 1,
  preview,
  onClear,
  disabled = false,
  title,
  hint,
  compact = false,
  previewAlt = '图片预览',
  previewLabel = '已选择图片',
  className = ''
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = (list: FileList | null) => {
    const files = fileListToArray(list);
    const message = validateImageFiles(files, multiple ? maxFiles : 1);
    if (message) {
      setError(message);
      return;
    }
    setError('');
    onFiles(files);
  };

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
        className={`w-full cursor-pointer rounded-2xl border-2 border-dashed text-left transition ${
          disabled ? 'cursor-not-allowed opacity-60' : ''
        } ${
          dragging
            ? 'border-teal-500 bg-teal-50'
            : 'border-slate-300 bg-white/70 hover:border-teal-400 hover:bg-teal-50/40'
        } ${compact ? 'p-3' : 'p-4'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple={multiple}
          disabled={disabled}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />

        {preview ? (
          <div className="flex items-center gap-3">
            <img src={preview} alt={previewAlt} className="h-20 w-20 rounded-xl border border-slate-200 object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-700">{previewLabel}</p>
              <p className="mt-0.5 text-xs text-slate-400">点击或拖拽到这里可以更换</p>
              <span className="mt-2 inline-flex rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white">
                更换图片
              </span>
              {onClear && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  className="ml-2 text-xs font-medium text-slate-400 hover:text-red-600"
                >
                  移除
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={`flex flex-col items-center text-center ${compact ? 'gap-1.5 py-1' : 'gap-2 py-3'}`}>
            <div className={`flex items-center justify-center rounded-2xl bg-teal-100 text-teal-700 ${compact ? 'h-9 w-9' : 'h-12 w-12'}`}>
              <ImageIcon className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
            </div>
            <p className={`font-medium text-slate-700 ${compact ? 'text-sm' : 'text-base'}`}>
              {title || (multiple ? '把图片拖到这里，或点击选择' : '点击或拖拽图片到这里')}
            </p>
            <span
              className={`inline-flex items-center justify-center rounded-xl bg-teal-600 font-medium text-white shadow-sm transition hover:bg-teal-700 ${
                compact ? 'px-4 py-1.5 text-xs' : 'px-5 py-2 text-sm'
              }`}
            >
              选择图片
            </span>
            <p className="text-xs text-slate-400">
              {hint || `支持 JPG / PNG / WEBP，单张不超过 5MB${multiple ? `，一次最多 ${maxFiles} 张` : ''}`}
            </p>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
