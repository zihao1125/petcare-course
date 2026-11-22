import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Avatar, Badge, btnPrimary, Card, Empty, ErrorText, SectionTitle, Spinner } from '../components/ui';
import { dueInfo, petMeta, sumCounts } from '../utils';
import type { Pet, Reminder } from '../types';

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
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl">你好，{user?.username}</h1>
          <p className="mt-1 text-sm text-slate-500">在这里管理宠物的健康档案与日常记录</p>
        </div>
        <Link to="/pets/new" className={btnPrimary}>
          ＋ 添加宠物
        </Link>
      </div>

      <ErrorText>{error}</ErrorText>

      {reminders.length > 0 && (
        <Card>
          <SectionTitle action={<Badge className="bg-amber-100 text-amber-700">{reminders.length} 项</Badge>}>
            即将到期
          </SectionTitle>
          <ul className="divide-y divide-slate-100">
            {reminders.map((r) => {
              const due = dueInfo(r.due_date);
              return (
                <li key={`${r.kind}-${r.record_id}-${r.pet_id}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <Link to={`/pets/${r.pet_id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {r.pet_name} · {r.title}
                    </p>
                    <p className="text-xs text-slate-400">
                      {r.kind === 'vaccination' ? '疫苗' : r.kind === 'deworming' ? '驱虫' : '复诊'} · 到期日 {r.due_date}
                    </p>
                  </Link>
                  <Badge className={due.className}>{due.text}</Badge>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <section>
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                    <Avatar src={pet.avatar_path} name={pet.name} />
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
    </div>
  );
}
