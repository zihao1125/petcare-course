import { Badge, Card, Empty, SectionTitle } from '../../components/ui';
import { dueInfo, fmtDate, GENDER_LABEL, NEUTERED_LABEL, SPECIES_LABEL } from '../../utils';
import type { PetDetailData, Reminder } from '../../types';

export default function OverviewTab({ data, reminders }: { data: PetDetailData; reminders: Reminder[] }) {
  const { pet } = data;
  const stats: Array<[string, number]> = [
    ['体重记录', data.weights.length],
    ['身体状况', data.health.length],
    ['就医记录', data.visits.length],
    ['疫苗记录', data.vaccinations.length],
    ['驱虫记录', data.dewormings.length],
    ['生活照', data.photos.length]
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <SectionTitle>档案信息</SectionTitle>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-slate-400">宠物类型</dt>
            <dd className="mt-0.5 text-slate-800">{SPECIES_LABEL[pet.species]}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">品种</dt>
            <dd className="mt-0.5 text-slate-800">{pet.breed || '未填写'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">性别</dt>
            <dd className="mt-0.5 text-slate-800">{GENDER_LABEL[pet.gender || 'unknown']}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">绝育状态</dt>
            <dd className="mt-0.5 text-slate-800">{NEUTERED_LABEL[pet.neutered || 'unknown']}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">生日</dt>
            <dd className="mt-0.5 text-slate-800">{fmtDate(pet.birthday)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">建档时间</dt>
            <dd className="mt-0.5 text-slate-800">{fmtDate(pet.created_at)}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <SectionTitle>记录统计</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 px-3 py-2.5">
              <p className="text-xs text-slate-400">{label}</p>
              <p className="mt-0.5 text-lg font-semibold text-slate-800">{value}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="md:col-span-2">
        <SectionTitle>近 7 天到期提醒</SectionTitle>
        {reminders.length === 0 ? (
          <Empty text="近 7 天没有疫苗、驱虫或复诊到期" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {reminders.map((r) => {
              const due = dueInfo(r.due_date);
              return (
                <li key={`${r.kind}-${r.record_id}`} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-sm text-slate-800">{r.title}</p>
                    <p className="text-xs text-slate-400">
                      {r.kind === 'vaccination' ? '疫苗' : r.kind === 'deworming' ? '驱虫' : '复诊'} · {r.due_date}
                    </p>
                  </div>
                  <Badge className={due.className}>{due.text}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
