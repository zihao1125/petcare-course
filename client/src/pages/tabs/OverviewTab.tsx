import { useMemo, useState } from 'react';
import { Badge, btnPrimary, Card, Empty, inputCls, SectionTitle } from '../../components/ui';
import { fmtDate, GENDER_LABEL, NEUTERED_LABEL, SPECIES_LABEL } from '../../utils';
import type { PetDetailData, PetTabKey } from '../../types';

type Category = 'health' | 'visits' | 'vaccinations' | 'dewormings' | 'medications' | 'photos';

interface RecentItem {
  key: string;
  category: Category;
  type: string;
  date: string;
  summary: string;
  tab: PetTabKey;
}

const CATEGORY_LABEL: Record<Category | 'all', string> = {
  all: '全部类别',
  health: '身体情况',
  visits: '就医',
  vaccinations: '疫苗',
  dewormings: '驱虫',
  medications: '用药',
  photos: '生活照'
};

const TYPE_CLASS: Record<Category, string> = {
  health: 'bg-teal-50 text-teal-800',
  visits: 'bg-red-50 text-red-600',
  vaccinations: 'bg-amber-50 text-amber-700',
  dewormings: 'bg-emerald-50 text-emerald-700',
  medications: 'bg-violet-50 text-violet-700',
  photos: 'bg-pink-50 text-pink-700'
};

export default function OverviewTab({
  data,
  onNavigate,
  onOpenRecord
}: {
  data: PetDetailData;
  onNavigate: (tab: PetTabKey) => void;
  onOpenRecord: (tab: PetTabKey, recordKey: string) => void;
}) {
  const { pet } = data;
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showAll, setShowAll] = useState(false);

  const healthTotal = data.weights.length + data.health.length;
  const stats: Array<{ label: string; value: number; tab: PetTabKey; hint: string }> = [
    { label: '健康记录', value: healthTotal, tab: 'health', hint: '体重记录 + 身体状况记录' },
    { label: '就医记录', value: data.visits.length, tab: 'visits', hint: '就诊记录' },
    { label: '生活照', value: data.photos.length, tab: 'photos', hint: '已保存的生活照' },
    { label: '疫苗', value: data.vaccinations.length, tab: 'prevention', hint: '疫苗记录' },
    { label: '驱虫', value: data.dewormings.length, tab: 'prevention', hint: '驱虫记录' },
    { label: '用药', value: data.medications.length, tab: 'medications', hint: '用药记录' }
  ];

  const recent = useMemo(() => {
    const items: RecentItem[] = [];

    data.weights.forEach((w) => {
      items.push({
        key: `weight-${w.id}`,
        category: 'health',
        type: '体重',
        date: w.record_date,
        summary: `${w.weight_kg} kg${w.note ? ` · ${w.note}` : ''}`,
        tab: 'health'
      });
    });

    data.health.forEach((h) => {
      const parts = [
        h.temperature != null ? `体温 ${h.temperature}℃` : '',
        h.appetite ? `食欲 ${h.appetite}` : '',
        h.mental_state ? `精神 ${h.mental_state}` : ''
      ].filter(Boolean);
      items.push({
        key: `health-${h.id}`,
        category: 'health',
        type: '身体状况',
        date: h.record_date,
        summary: h.symptoms || parts.join(' · ') || '身体状况记录',
        tab: 'health'
      });
    });

    data.visits.forEach((v) => {
      items.push({
        key: `visit-${v.id}`,
        category: 'visits',
        type: '就医',
        date: v.visit_date,
        summary: v.diagnosis || v.chief_complaint || v.hospital || '就医记录',
        tab: 'visits'
      });
    });

    data.vaccinations.forEach((v) => {
      items.push({
        key: `vacc-${v.id}`,
        category: 'vaccinations',
        type: '疫苗',
        date: v.date,
        summary: `${v.vaccine_name}${v.dose_no ? ` · ${v.dose_no}` : ''}`,
        tab: 'prevention'
      });
    });

    data.dewormings.forEach((d) => {
      items.push({
        key: `deworm-${d.id}`,
        category: 'dewormings',
        type: '驱虫',
        date: d.date,
        summary: d.type,
        tab: 'prevention'
      });
    });

    data.medications.forEach((m) => {
      items.push({
        key: `med-${m.id}`,
        category: 'medications',
        type: '用药',
        date: m.start_date || m.created_at.slice(0, 10),
        summary: [m.name, m.dosage, m.frequency].filter(Boolean).join(' · '),
        tab: 'medications'
      });
    });

    data.photos.forEach((p) => {
      items.push({
        key: `photo-${p.id}`,
        category: 'photos',
        type: '生活照',
        date: p.created_at.slice(0, 10),
        summary: p.caption || p.tags || '生活照',
        tab: 'photos'
      });
    });

    return items.sort((a, b) => b.date.localeCompare(a.date) || b.key.localeCompare(a.key));
  }, [data]);

  const filtered = recent.filter((item) => {
    if (category !== 'all' && item.category !== category) return false;
    if (from && item.date < from) return false;
    if (to && item.date > to) return false;
    return true;
  });
  const visible = showAll ? filtered : filtered.slice(0, 8);
  const hasFilter = category !== 'all' || !!from || !!to;

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
        <SectionTitle action={<span className="text-xs text-slate-400">点击进入栏目</span>}>记录统计</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {stats.map((stat) => (
            <button
              key={stat.label}
              type="button"
              title={stat.hint}
              onClick={() => onNavigate(stat.tab)}
              className="rounded-xl bg-slate-50 px-2.5 py-2 text-left transition hover:bg-teal-50 hover:ring-1 hover:ring-teal-200"
            >
              <p className="truncate text-[11px] text-slate-400">{stat.label}</p>
              <p className="mt-0.5 text-lg font-semibold text-slate-800">{stat.value}</p>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">健康记录 = 体重记录 + 身体状况记录；数据来自各栏目实际记录数。</p>
      </Card>

      <Card className="md:col-span-2">
        <SectionTitle action={<span className="text-xs text-slate-400">共 {recent.length} 条</span>}>
          最近记录
        </SectionTitle>

        {recent.length === 0 ? (
          <Empty
            text="还没有任何记录，先记录一次身体情况吧"
            action={
              <button type="button" className={btnPrimary} onClick={() => onNavigate('health')}>
                去记录
              </button>
            }
          />
        ) : (
          <>
            <div className="mb-3 grid gap-2 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
              <select
                className={inputCls}
                value={category}
                onChange={(e) => setCategory(e.target.value as Category | 'all')}
                aria-label="按类别筛选"
              >
                {(Object.keys(CATEGORY_LABEL) as Array<Category | 'all'>).map((key) => (
                  <option key={key} value={key}>
                    {CATEGORY_LABEL[key]}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className={inputCls}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                aria-label="开始日期"
              />
              <input
                type="date"
                className={inputCls}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                aria-label="结束日期"
              />
              <button
                type="button"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                disabled={!hasFilter}
                onClick={() => {
                  setCategory('all');
                  setFrom('');
                  setTo('');
                }}
              >
                清除
              </button>
            </div>

            {filtered.length === 0 ? (
              <Empty text="没有符合筛选条件的记录" />
            ) : (
              <>
                <ul className="divide-y divide-slate-100">
                  {visible.map((item) => (
                    <li key={item.key}>
                      <button
                        type="button"
                        onClick={() => onOpenRecord(item.tab, item.key)}
                        className="flex w-full items-center gap-2 rounded-lg px-1 py-2.5 text-left transition hover:bg-slate-50"
                      >
                        <span className="w-[5.2rem] shrink-0 text-xs text-slate-400">{item.date}</span>
                        <Badge className={TYPE_CLASS[item.category]}>{item.type}</Badge>
                        <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{item.summary}</span>
                        <span className="text-lg leading-none text-slate-300">›</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {filtered.length > 8 && (
                  <button
                    type="button"
                    className="mt-2 w-full rounded-xl border border-slate-200 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
                    onClick={() => setShowAll((v) => !v)}
                  >
                    {showAll ? '收起' : `查看全部 ${filtered.length} 条`}
                  </button>
                )}
              </>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
