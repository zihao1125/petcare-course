import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import HeroCarousel from '../components/HeroCarousel';
import {
  Avatar,
  Badge,
  btnPrimary,
  Card,
  Empty,
  Modal,
  SectionTitle,
  Spinner
} from '../components/ui';
import { dueInfo, petMeta } from '../utils';
import type { Pet, PetTabKey, Reminder } from '../types';

interface QuickAction {
  key: 'health' | 'visits' | 'photos';
  label: string;
  description: string;
  tab: PetTabKey;
}

const QUICK_ACTIONS: QuickAction[] = [
  { key: 'health', label: '记录身体情况', description: '体重、体温、饮食与症状', tab: 'health' },
  { key: 'visits', label: '添加就医记录', description: '诊断、处方与检查报告', tab: 'visits' },
  { key: 'photos', label: '上传生活照', description: '留住它的可爱瞬间', tab: 'photos' }
];

const TIPS = [
  '每周固定一天称重，连续记录更容易发现变化。',
  '疫苗、驱虫到期前 7 天，提前准备就诊安排。',
  '就医后把诊断和报告拍照留档，复诊时直接用。'
];

function QuickIcon({ kind }: { kind: QuickAction['key'] }) {
  const paths = {
    health: <path d="M3 12h4l2-5 3 10 2-5h5" />,
    visits: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M12 8v8M8 12h8" />
      </>
    ),
    photos: (
      <>
        <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
        <circle cx="12" cy="13" r="3.2" />
      </>
    )
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      {paths[kind]}
    </svg>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [error, setError] = useState('');
  const [reminderError, setReminderError] = useState('');
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState<QuickAction | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const p = await api<{ pets: Pet[] }>('/pets');
      setPets(p.pets);
    } catch (err) {
      setPets(null);
      setError(err instanceof Error ? err.message : '首页加载失败');
      setLoading(false);
      return;
    }
    try {
      const r = await api<{ reminders: Reminder[] }>('/pets/reminders');
      setReminders(r.reminders);
      setReminderError('');
    } catch (err) {
      setReminders([]);
      setReminderError(err instanceof Error ? err.message : '到期提醒加载失败');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!pets && loading) return <Spinner />;

  if (!pets) {
    return (
      <div className="space-y-5">
        <HeroCarousel />
        <Card>
          <p className="text-sm font-medium text-red-700">首页加载失败</p>
          <p className="mt-1 text-sm text-slate-500">{error || '请检查服务是否正常，然后重试。'}</p>
          <button type="button" className={`${btnPrimary} mt-4`} onClick={load} disabled={loading}>
            {loading ? '加载中…' : '重新加载'}
          </button>
        </Card>
      </div>
    );
  }

  const startAction = (action: QuickAction) => {
    if (pets.length === 0) {
      navigate('/pets/new');
      return;
    }
    if (pets.length === 1) {
      navigate(`/pets/${pets[0].id}?tab=${action.tab}&new=1`);
      return;
    }
    setPicker(action);
  };

  return (
    <div className="space-y-5">
      <HeroCarousel />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-teal-700">今天也要好好照顾它</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900 md:text-2xl">你好，{user?.username}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {pets.length > 0 ? `已为 ${pets.length} 只毛孩子建立健康档案` : '先为家里的毛孩子建立第一份健康档案吧'}
          </p>
        </div>
        <Link to="/pets/new" className={btnPrimary}>
          ＋ 添加宠物
        </Link>
      </div>

      <section>
        <SectionTitle>快捷记录</SectionTitle>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => startAction(action)}
              className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <QuickIcon kind={action.key} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-800">{action.label}</span>
                <span className="block truncate text-xs text-slate-400">
                  {pets.length === 0 ? '先添加宠物后使用' : action.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="xl:col-span-2">
          <SectionTitle>我的宠物</SectionTitle>
          {pets.length === 0 ? (
            <Empty
              text="还没有宠物档案，先添加一只吧"
              action={
                <Link to="/pets/new" className={btnPrimary}>
                  创建第一只宠物
                </Link>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {pets.map((pet) => {
                const petReminders = reminders.filter((r) => r.pet_id === pet.id);
                const urgent = petReminders.some((r) => r.days_left <= 7);
                const healthTotal = (pet.counts?.weights ?? 0) + (pet.counts?.health ?? 0);
                return (
                  <Link
                    key={pet.id}
                    to={`/pets/${pet.id}`}
                    className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-full p-0.5 ring-2 ring-teal-100 transition group-hover:ring-teal-200">
                        <Avatar src={pet.avatar_path} name={pet.name} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-slate-900">{pet.name}</p>
                        <p className="truncate text-xs text-slate-500">{petMeta(pet)}</p>
                      </div>
                      {urgent && <Badge className="bg-amber-100 text-amber-700">待处理</Badge>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-slate-500">
                      <Badge className="bg-teal-50 text-teal-800">健康 {healthTotal}</Badge>
                      <Badge>就医 {pet.counts?.visits ?? 0}</Badge>
                      <Badge>照片 {pet.counts?.photos ?? 0}</Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <Card>
            <SectionTitle action={<Badge className="bg-amber-100 text-amber-700">{reminders.length} 项</Badge>}>
              即将到期
            </SectionTitle>
            {reminderError ? (
              <div className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-700">
                <p>{reminderError}</p>
                <button type="button" className="mt-2 text-sm font-medium underline" onClick={load} disabled={loading}>
                  重试
                </button>
              </div>
            ) : reminders.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">
                近 7 天没有疫苗、驱虫或复诊到期
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {reminders.slice(0, 6).map((r) => {
                  const due = dueInfo(r.due_date);
                  return (
                    <li key={`${r.kind}-${r.record_id}-${r.pet_id}`} className="py-2.5">
                      <Link to={`/pets/${r.pet_id}`} className="block">
                        <div className="flex items-center justify-between gap-2">
                          <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                            {r.pet_name} · {r.title}
                          </p>
                          <Badge className={due.className}>{due.text}</Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {r.kind === 'vaccination' ? '疫苗' : r.kind === 'deworming' ? '驱虫' : '复诊'} · 到期日{' '}
                          {r.due_date}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <SectionTitle>养宠小贴士</SectionTitle>
            <ol className="space-y-3">
              {TIPS.map((tip, i) => (
                <li key={tip} className="flex gap-2.5 text-sm text-slate-600">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-semibold text-teal-800">
                    {i + 1}
                  </span>
                  <span className="leading-5">{tip}</span>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>

      <Modal
        open={!!picker}
        title="选择要记录的宠物"
        onClose={() => setPicker(null)}
      >
        <div className="space-y-2">
          {pets.map((pet) => (
            <button
              key={pet.id}
              type="button"
              onClick={() => {
                const tab = picker?.tab;
                setPicker(null);
                if (tab) navigate(`/pets/${pet.id}?tab=${tab}&new=1`);
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-teal-300 hover:bg-teal-50/40"
            >
              <Avatar src={pet.avatar_path} name={pet.name} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-800">{pet.name}</span>
                <span className="block truncate text-xs text-slate-400">{petMeta(pet)}</span>
              </span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
