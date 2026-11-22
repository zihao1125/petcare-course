import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import HeroCarousel from '../components/HeroCarousel';
import { Avatar, Badge, btnPrimary, Card, Empty, ErrorText, SectionTitle, Spinner } from '../components/ui';
import { dueInfo, petMeta, sumCounts } from '../utils';
import type { Pet, Reminder } from '../types';

const TIPS = [
  '每周固定一天称重，连续记录更容易发现变化。',
  '疫苗、驱虫到期前 7 天，提前准备就诊安排。',
  '就医后把诊断和报告拍照留档，复诊时直接用。'
];

export default function Dashboard() {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api<{ pets: Pet[] }>('/pets'), api<{ reminders: Reminder[] }>('/pets/reminders')])
      .then(([p, r]) => {
        setPets(p.pets);
        setReminders(r.reminders);
      })
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'));
  }, []);

  if (!pets) {
    return <Spinner />;
  }

  return (
    <div className="space-y-6">
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

      <ErrorText>{error}</ErrorText>

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
                      <Badge>记录 {sumCounts(pet.counts)}</Badge>
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
            {reminders.length === 0 ? (
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
    </div>
  );
}
