import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { Avatar, Badge, btnSecondary, Card, ErrorText, Spinner } from '../components/ui';
import { dueInfo, fmtDate, GENDER_LABEL, NEUTERED_LABEL, petMeta } from '../utils';
import type {
  Deworming,
  HealthRecord,
  Medication,
  Pet,
  PetDetailData,
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

const TABS = [
  { key: 'overview', label: '概览' },
  { key: 'health', label: '身体状况' },
  { key: 'visits', label: '就医' },
  { key: 'prevention', label: '防疫驱虫' },
  { key: 'medications', label: '用药' },
  { key: 'photos', label: '生活照' }
] as const;

type TabKey = (typeof TABS)[number]['key'];

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
  const [data, setData] = useState<PetDetailData | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [tab, setTab] = useState<TabKey>('overview');
  const [error, setError] = useState('');

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
    return error ? <ErrorText>{error}</ErrorText> : <Spinner />;
  }

  const { pet } = data;

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
              return (
                <span key={`${r.kind}-${r.record_id}`} className={`rounded-full px-2.5 py-1 text-xs font-medium ${due.className}`}>
                  {r.kind === 'vaccination' ? '疫苗' : r.kind === 'deworming' ? '驱虫' : '复诊'}：{r.title} · {due.text}
                </span>
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
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-medium transition ${
              tab === t.key ? 'border-b-2 border-teal-600 text-teal-800' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab data={data} reminders={reminders} />}
      {tab === 'health' && <HealthTab petId={pet.id} data={data} reload={load} />}
      {tab === 'visits' && <VisitsTab petId={pet.id} data={data} reload={load} />}
      {tab === 'prevention' && <PreventionTab petId={pet.id} data={data} reload={load} />}
      {tab === 'medications' && <MedicationsTab petId={pet.id} data={data} reload={load} />}
      {tab === 'photos' && <PhotosTab petId={pet.id} data={data} reload={load} />}

      <ErrorText>{error}</ErrorText>
    </div>
  );
}
