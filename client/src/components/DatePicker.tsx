import { useEffect, useMemo, useRef, useState } from 'react';
import { inputCls } from './ui';

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const navBtn =
  'flex h-7 w-6 shrink-0 items-center justify-center rounded-lg text-base leading-none text-slate-500 transition hover:bg-slate-100 hover:text-teal-700';
const selectCls =
  'rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-sm text-slate-700 outline-none transition focus:border-teal-500';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function parseDate(value: string) {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!matched) return null;
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

export default function DatePicker({ value, onChange, placeholder = '请选择日期', className = '' }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const parsed = parseDate(value);
  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth() + 1);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const thisYear = today.getFullYear();
  const minYear = Math.min(thisYear - 60, parsed?.year ?? thisYear);
  const maxYear = Math.max(thisYear, parsed?.year ?? thisYear);

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = maxYear; y >= minYear; y -= 1) list.push(y);
    return list;
  }, [minYear, maxYear]);

  const toggleOpen = () => {
    if (!open) {
      const base = parseDate(value);
      const now = new Date();
      setViewYear(base?.year ?? now.getFullYear());
      setViewMonth(base?.month ?? now.getMonth() + 1);
    }
    setOpen((prev) => !prev);
  };

  const shiftMonth = (delta: number) => {
    let year = viewYear;
    let month = viewMonth + delta;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    if (month > 12) {
      month = 1;
      year += 1;
    }
    setViewYear(Math.min(maxYear, Math.max(minYear, year)));
    setViewMonth(month);
  };

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay();
  const cells: Array<number | null> = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  const isSelected = (day: number) =>
    Boolean(parsed && parsed.year === viewYear && parsed.month === viewMonth && parsed.day === day);
  const isToday = (day: number) =>
    today.getFullYear() === viewYear && today.getMonth() + 1 === viewMonth && today.getDate() === day;

  const pick = (day: number) => {
    onChange(`${viewYear}-${pad(viewMonth)}-${pad(day)}`);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`${inputCls} flex items-center justify-between gap-2 text-left`}
      >
        <span className={value ? 'text-slate-900' : 'text-slate-400'}>{value || placeholder}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="h-4 w-4 shrink-0 text-slate-400"
          aria-hidden="true"
        >
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
          <path d="M8 3.5v3M16 3.5v3M3.5 10h17" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="选择日期"
          className="absolute left-0 top-full z-30 mt-1 w-[19rem] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
        >
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={navBtn}
              title="上一年"
              aria-label="上一年"
              onClick={() => setViewYear(Math.max(minYear, viewYear - 1))}
            >
              «
            </button>
            <button type="button" className={navBtn} title="上个月" aria-label="上个月" onClick={() => shiftMonth(-1)}>
              ‹
            </button>
            <div className="flex flex-1 items-center justify-center gap-1">
              <select
                className={selectCls}
                aria-label="年份"
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}年
                  </option>
                ))}
              </select>
              <select
                className={selectCls}
                aria-label="月份"
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}月
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className={navBtn} title="下个月" aria-label="下个月" onClick={() => shiftMonth(1)}>
              ›
            </button>
            <button
              type="button"
              className={navBtn}
              title="下一年"
              aria-label="下一年"
              onClick={() => setViewYear(Math.min(maxYear, viewYear + 1))}
            >
              »
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 text-center text-[11px] text-slate-400">
            {WEEKDAYS.map((w) => (
              <span key={w} className="py-1">
                {w}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center">
            {cells.map((day, idx) => {
              if (day === null) return <span key={`blank-${idx}`} />;
              const selected = isSelected(day);
              const current = isToday(day);
              return (
                <button
                  key={`${viewYear}-${viewMonth}-${day}`}
                  type="button"
                  onClick={() => pick(day)}
                  className={`h-8 rounded-lg text-sm transition ${
                    selected
                      ? 'bg-teal-700 font-semibold text-white hover:bg-teal-800'
                      : current
                        ? 'text-teal-700 ring-1 ring-inset ring-teal-400 hover:bg-teal-50'
                        : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            <button
              type="button"
              className="text-xs font-medium text-teal-700 hover:text-teal-900"
              onClick={() => {
                const now = new Date();
                setViewYear(now.getFullYear());
                setViewMonth(now.getMonth() + 1);
              }}
            >
              回到本月
            </button>
            {value ? (
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-red-600"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
              >
                清除
              </button>
            ) : (
              <span />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
