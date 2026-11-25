import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { Avatar, Badge, btnPrimary, btnSecondary, Card, ErrorText, Spinner } from '../components/ui';
import { dueInfo, fmtDate, GENDER_LABEL, NEUTERED_LABEL, petMeta, reminderTarget } from '../utils';
import type {
  Deworming,
  HealthRecord,
  Medication,
  Pet,
  PetDetailData,
  PetTabKey,
  Photo,
  Reminder,
  Vaccination,
  Visit,
  WeightRecord
} from '../types';
import OverviewTab from './tabs/OverviewTab';
import HealthTab from './tabs/HealthTab';
import VisitsTab from './tabs/VisitsTab';
import PreventionTab from './tabs/PreventionTab';
import PhotosTab from './tabs/PhotosTab';
import MedicationsTab from './tabs/MedicationsTab';

const TABS: Array<{ key: PetTabKey; label: string }> = [
  { key: 'overview', label: '概览' },
  { key: 'health', label: '身体状况' },
  { key: 'visits', label: '就医' },
  { key: 'prevention', label: '防疫驱虫' },
  { key: 'medications', label: '用药' },
  { key: 'photos', label: '生活照' }
];

const TAB_KEYS = TABS.map((t) => t.key);

interface Responses {
  pet: Pet;
  weights: WeightRecord[];
  health: HealthRecord[];
  medications: Medication[];
  visits: Visit[];
  vaccinations: Vaccination[];
  dewormings: Deworming[];
  photos: Photo[];
}

export default function PetDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab') as PetTabKey | null;
  const [data, setData] = useState<PetDetailData | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [tab, setTab] = useState<PetTabKey>(
    requestedTab && TAB_KEYS.includes(requestedTab) ? requestedTab : 'overview'
  );
  const [autoNew, setAutoNew] = useState(searchParams.get('new') === '1');
  const [highlight, setHighlight] = useState<string | null>(searchParams.get('record'));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!searchParams.toString()) return;
    const timer = window.setTimeout(() => setSearchParams({}, { replace: true }), 0);
    return () => window.clearTimeout(timer);
    // 只在首次进入时清理快捷入口参数
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoNew) return;
    const timer = window.setTimeout(() => setAutoNew(false), 300);
    return () => window.clearTimeout(timer);
  }, [autoNew]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [pet, weights, health, medications, visits, vaccinations, dewormings, photos, rem] = await Promise.all([
        api<{ pet: Pet }>(`/pets/${id}`),
        api<{ records: WeightRecord[] }>(`/pets/${id}/weights`),
        api<{ records: HealthRecord[] }>(`/pets/${id}/health`),
        api<{ records: Medication[] }>(`/pets/${id}/medications`),
        api<{ records: Visit[] }>(`/pets/${id}/visits`),
        api<{ records: Vaccination[] }>(`/pets/${id}/vaccinations`),
        api<{ records: Deworming[] }>(`/pets/${id}/dewormings`),
        api<{ records: Photo[] }>(`/pets/${id}/photos`),
        api<{ reminders: Reminder[] }>('/pets/reminders')
      ]);
      const merged: Responses = {
        pet: pet.pet,
        weights: weights.records,
        health: health.records,
        medications: medications.records,
        visits: visits.records,
        vaccinations: vaccinations.records,
        dewormings: dewormings.records,
        photos: photos.records
      };
      setData(merged);
      setReminders(rem.reminders.filter((r) => r.pet_id === Number(id)));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) {
    if (!error) return <Spinner />;
    return (
      <Card>
        <p className="text-sm font-medium text-red-700">宠物档案加载失败</p>
        <p className="mt-1 text-sm text-slate-500">{error}</p>
        <button type="button" className={`${btnPrimary} mt-4`} onClick={load}>
          重新加载
        </button>
      </Card>
    );
  }

  const { pet } = data;

  const openTab = (next: PetTabKey) => {
    setTab(next);
    setHighlight(null);
    setAutoNew(false);
  };

  const openRecord = (next: PetTabKey, recordKey: string) => {
    setTab(next);
    setHighlight(recordKey);
    setAutoNew(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-800">
          ← 返回宠物列表
        </Link>
        <Link to={`/pets/${pet.id}/edit`} className={btnSecondary}>
          编辑档案
        </Link>
      </div>

      <Card>
        <div className="flex items-start gap-4">
          <Avatar src={pet.avatar_path} name={pet.name} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-slate-900">{pet.name}</h1>
            <p className="mt-0.5 text-sm text-slate-500">{petMeta(pet)}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge>{GENDER_LABEL[pet.gender || 'unknown']}</Badge>
              <Badge>{NEUTERED_LABEL[pet.neutered || 'unknown']}</Badge>
              {pet.birthday && <Badge>生日 {fmtDate(pet.birthday)}</Badge>}
            </div>
          </div>
        </div>
        {pet.note && <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">{pet.note}</p>}
        {reminders.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {reminders.map((r) => {
              const due = dueInfo(r.due_date);
              const target = reminderTarget(r);
              return (
                <button
                  key={`${r.kind}-${r.record_id}`}
                  type="button"
                  onClick={() => openRecord(target.tab, target.record)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition hover:ring-2 hover:ring-teal-300 ${due.className}`}
                  title="点击查看这条记录，可修改日期"
                >
                  {target.label}：{r.title} · {due.text}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => openTab(t.key)}
            className={`whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-medium transition ${
              tab === t.key ? 'border-b-2 border-teal-600 text-teal-800' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab data={data} onNavigate={openTab} onOpenRecord={openRecord} />}
      {tab === 'health' && (
        <HealthTab petId={pet.id} data={data} reload={load} openNew={autoNew} highlight={highlight} />
      )}
      {tab === 'visits' && (
        <VisitsTab petId={pet.id} data={data} reload={load} openNew={autoNew} highlight={highlight} />
      )}
      {tab === 'prevention' && <PreventionTab petId={pet.id} data={data} reload={load} highlight={highlight} />}
      {tab === 'medications' && (
        <MedicationsTab petId={pet.id} data={data} reload={load} highlight={highlight} />
      )}
      {tab === 'photos' && (
        <PhotosTab petId={pet.id} data={data} reload={load} openNew={autoNew} highlight={highlight} />
      )}

      <ErrorText>{error}</ErrorText>
    </div>
  );
}
