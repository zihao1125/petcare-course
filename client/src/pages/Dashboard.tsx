import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { dueGroup, dueInfo, petMeta, reminderLink, reminderTarget } from '../utils';
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

const REMINDER_GROUPS: Array<{
  key: 'overdue' | 'today' | 'soon';
  label: string;
  description: string;
  dot: string;
  text: string;
}> = [
  { key: 'overdue', label: '已逾期', description: '已经超过到期日，尽快处理', dot: 'bg-red-500', text: 'text-red-700' },
  { key: 'today', label: '今天到期', description: '今天需要安排', dot: 'bg-orange-500', text: 'text-orange-700' },
  { key: 'soon', label: '即将到期', description: '7 天内到期', dot: 'bg-amber-400', text: 'text-amber-700' }
];

function ReminderRow({ reminder, compact = false }: { reminder: Reminder; compact?: boolean }) {
  const due = dueInfo(reminder.due_date);
  const target = reminderTarget(reminder);
  return (
    <Link
      to={reminderLink(reminder)}
      className={`block rounded-lg px-2 py-2 transition hover:bg-teal-50/60 ${compact ? '' : 'ring-1 ring-slate-100'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
          {reminder.pet_name} · {reminder.title}
        </p>
        <Badge className={due.className}>{due.text}</Badge>
      </div>
      <p className="mt-0.5 text-xs text-slate-400">
        {target.label} · 到期日 {reminder.due_date} · 点击查看或改日期
      </p>
    </Link>
  );
}

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
  const [allRemindersOpen, setAllRemindersOpen] = useState(false);

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

  const groupedReminders = useMemo(() => {
    const groups: Record<'overdue' | 'today' | 'soon', Reminder[]> = { overdue: [], today: [], soon: [] };
    reminders.forEach((reminder) => groups[dueGroup(reminder.days_left)].push(reminder));
    return groups;
  }, [reminders]);

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
              到期提醒
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
              <div className="space-y-3">
                {REMINDER_GROUPS.map((group) => {
                  const list = groupedReminders[group.key];
                  if (list.length === 0) return null;
                  return (
                    <section key={group.key}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className={`flex items-center gap-1.5 text-xs font-semibold ${group.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${group.dot}`} />
                          {group.label}
                          <span className="font-normal text-slate-400">· {group.description}</span>
                        </p>
                        <span className="text-xs text-slate-400">{list.length} 项</span>
                      </div>
                      <ul className="divide-y divide-slate-100">
                        {list.slice(0, 2).map((r) => (
                          <li key={`${r.kind}-${r.record_id}-${r.pet_id}`}>
                            <ReminderRow reminder={r} compact />
                          </li>
                        ))}
                      </ul>
                      {list.length > 2 && (
                        <button
                          type="button"
                          className="mt-0.5 text-xs text-teal-700 hover:text-teal-900"
                          onClick={() => setAllRemindersOpen(true)}
                        >
                          本组还有 {list.length - 2} 项，查看全部
                        </button>
                      )}
                    </section>
                  );
                })}
                {reminders.length > 4 && (
                  <button
                    type="button"
                    className="w-full rounded-xl border border-slate-200 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
                    onClick={() => setAllRemindersOpen(true)}
                  >
                    查看全部 {reminders.length} 项提醒
                  </button>
                )}
                <p className="text-[11px] text-slate-400">点任意一条可直接打开对应记录，查看或修改到期日期。</p>
              </div>
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

      <Modal
        open={allRemindersOpen}
        title={`全部到期提醒（${reminders.length} 项）`}
        onClose={() => setAllRemindersOpen(false)}
        wide
        footer={
          <button type="button" className={btnPrimary} onClick={() => setAllRemindersOpen(false)}>
            知道了
          </button>
        }
      >
        <p className="mb-3 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
          按「已逾期 → 今天到期 → 即将到期」分组；点击任意一条会直接打开对应宠物的那条记录，可以查看或修改到期日期。
        </p>
        <div className="space-y-4">
          {REMINDER_GROUPS.map((group) => {
            const list = groupedReminders[group.key];
            return (
              <section key={group.key}>
                <div className="mb-1 flex items-center justify-between">
                  <p className={`flex items-center gap-1.5 text-sm font-semibold ${group.text}`}>
                    <span className={`h-2 w-2 rounded-full ${group.dot}`} />
                    {group.label}
                    <span className="text-xs font-normal text-slate-400">· {group.description}</span>
                  </p>
                  <span className="text-xs text-slate-400">{list.length} 项</span>
                </div>
                {list.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">没有此类提醒</p>
                ) : (
                  <ul className="space-y-1.5">
                    {list.map((r) => (
                      <li key={`${r.kind}-${r.record_id}-${r.pet_id}`} className="rounded-xl border border-slate-200">
                        <ReminderRow reminder={r} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
