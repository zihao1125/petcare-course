import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100';

export const labelCls = 'mb-1 block text-sm font-medium text-slate-600';

export const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60';

export const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60';

export const btnDanger =
  'inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60';

export const btnGhost = 'inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-900';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export function PasswordInput({ className = '', ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <input {...props} type={visible ? 'text' : 'password'} className={`${inputCls} pr-11`} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        onMouseDown={(e) => e.preventDefault()}
        aria-label={visible ? '隐藏密码' : '显示密码'}
        aria-pressed={visible}
        title={visible ? '隐藏密码' : '显示密码'}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-400 transition hover:text-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
      >
        {visible ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M3 3l18 18" />
            <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
            <path d="M9.9 5.2A10.4 10.4 0 0 1 12 5c5 0 9 4.5 9 7 0 .9-.5 2-1.4 3.1" />
            <path d="M6.1 6.2C4.2 7.6 3 9.5 3 12c0 2.5 4 7 9 7 1.3 0 2.5-.3 3.6-.8" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" />
            <circle cx="12" cy="12" r="2.6" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5 ${className}`}>{children}</section>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-slate-800">{children}</h2>
      {action}
    </div>
  );
}

export function Badge({ children, className = 'bg-slate-100 text-slate-600' }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{children}</span>;
}

export function Empty({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
      <p className="text-sm text-slate-500">{text}</p>
      {action}
    </div>
  );
}

export function Spinner({ text = '加载中…' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600" />
      {text}
    </div>
  );
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p>;
}

export function Field({ label, required, children, hint }: { label: string; required?: boolean; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className={labelCls}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function Avatar({
  src,
  name,
  size = 'md'
}: {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = { sm: 'h-9 w-9 text-sm', md: 'h-12 w-12 text-base', lg: 'h-20 w-20 text-2xl' };
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizes[size]} shrink-0 rounded-full border border-slate-200 object-cover`}
      />
    );
  }
  return (
    <div className={`${sizes[size]} flex shrink-0 items-center justify-center rounded-full bg-teal-100 font-semibold text-teal-700`}>
      {name.slice(0, 1)}
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        className={`max-h-[92vh] w-full ${wide ? 'md:max-w-2xl' : 'md:max-w-lg'} overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl md:rounded-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-2xl leading-none text-slate-400 hover:bg-slate-100">
            ×
          </button>
        </div>
        {children}
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function Confirm({
  open,
  title = '确认操作',
  message,
  confirmText = '确认',
  danger = true,
  busy,
  onCancel,
  onConfirm
}: {
  open: boolean;
  title?: string;
  message: ReactNode;
  confirmText?: string;
  danger?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onCancel} disabled={busy}>
            取消
          </button>
          <button type="button" className={danger ? btnDanger : btnPrimary} onClick={onConfirm} disabled={busy}>
            {busy ? '处理中…' : confirmText}
          </button>
        </>
      }
    >
      <div className="text-sm text-slate-600">{message}</div>
    </Modal>
  );
}
