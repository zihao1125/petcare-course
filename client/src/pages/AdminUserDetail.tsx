import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { Avatar, Badge, Card, Empty, ErrorText, SectionTitle, Spinner } from '../components/ui';
import { fmtDate, fmtMoney, GENDER_LABEL, NEUTERED_LABEL, petMeta } from '../utils';
import type { AdminUserDetail as AdminUserDetailType, Pet, PetRecords } from '../types';

type AdminPet = Pet & { records: PetRecords };

function Fold({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <details className="rounded-xl border border-slate-200 px-3 py-2">
      <summary className="cursor-pointer select-none text-sm font-medium text-slate-700">
        {title}（{count}）
      </summary>
      <div className="mt-2 space-y-2 text-sm text-slate-600">{children}</div>
    </details>
  );
}

function HealthMeta({ record }: { record: PetRecords['health'][number] }) {
  const pairs: Array<[string, string | number | null | undefined]> = [
    ['体温', record.temperature != null ? `${record.temperature}℃` : ''],
    ['食欲', record.appetite],
    ['饮水', record.water_intake],
    ['排便', record.stool],
    ['排尿', record.urine],
    ['呕吐', record.vomiting],
    ['精神', record.mental_state]
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {pairs
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => (
          <span key={k} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {k}：{v}
          </span>
        ))}
    </div>
  );
}

function PetBlock({ pet }: { pet: AdminPet }) {
  const r = pet.records;
  const total =
    r.weights.length +
    r.health.length +
    r.medications.length +
    r.visits.length +
    r.vaccinations.length +
    r.dewormings.length +
    r.photos.length;

  return (
    <Card>
      <div className="flex items-center gap-3">
        <Avatar src={pet.avatar_path} name={pet.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-slate-900">{pet.name}</p>
          <p className="truncate text-xs text-slate-500">{petMeta(pet)}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge>{GENDER_LABEL[pet.gender || 'unknown']}</Badge>
            <Badge>{NEUTERED_LABEL[pet.neutered || 'unknown']}</Badge>
            <Badge>共 {total} 条记录</Badge>
          </div>
        </div>
      </div>
      {pet.note && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{pet.note}</p>}

      <div className="mt-3 space-y-2">
        <Fold title="体重记录" count={r.weights.length}>
          {r.weights.length === 0 ? (
            <p className="text-xs text-slate-400">暂无</p>
          ) : (
            r.weights.map((w) => (
              <p key={w.id} className="text-xs text-slate-600">
                {fmtDate(w.record_date)} · {w.weight_kg} kg {w.note ? `· ${w.note}` : ''}
              </p>
            ))
          )}
        </Fold>

        <Fold title="身体状况" count={r.health.length}>
          {r.health.length === 0 ? (
            <p className="text-xs text-slate-400">暂无</p>
          ) : (
            r.health.map((h) => (
              <div key={h.id} className="border-b border-slate-50 pb-2 last:border-0">
                <p className="text-xs font-medium text-slate-700">{fmtDate(h.record_date)}</p>
                <HealthMeta record={h} />
                {h.symptoms && <p className="mt-1 text-xs text-slate-600">症状：{h.symptoms}</p>}
                {h.allergy_note && <p className="mt-1 text-xs text-red-600">过敏：{h.allergy_note}</p>}
              </div>
            ))
          )}
        </Fold>

        <Fold title="用药记录" count={r.medications.length}>
          {r.medications.length === 0 ? (
            <p className="text-xs text-slate-400">暂无</p>
          ) : (
            r.medications.map((m) => (
              <p key={m.id} className="text-xs text-slate-600">
                {m.name} · {[m.dosage, m.frequency].filter(Boolean).join(' / ') || '未填写剂量'} · {fmtDate(m.start_date)} ~ {fmtDate(m.end_date)}
              </p>
            ))
          )}
        </Fold>

        <Fold title="就医记录" count={r.visits.length}>
          {r.visits.length === 0 ? (
            <p className="text-xs text-slate-400">暂无</p>
          ) : (
            r.visits.map((v) => (
              <div key={v.id} className="border-b border-slate-50 pb-2 last:border-0">
                <p className="text-xs font-medium text-slate-700">
                  {fmtDate(v.visit_date)} · {v.hospital || '未填写医院'} {v.department ? `· ${v.department}` : ''}
                </p>
                {v.diagnosis && <p className="mt-0.5 text-xs text-slate-600">诊断：{v.diagnosis}</p>}
                {v.prescription && <p className="text-xs text-slate-600">处方：{v.prescription}</p>}
                <p className="text-xs text-slate-400">费用：{fmtMoney(v.cost)} · 复诊：{fmtDate(v.followup_date)}</p>
                {v.images && v.images.length > 0 && (
                  <div className="mt-1 grid grid-cols-4 gap-1">
                    {v.images.map((img) => (
                      <a key={img.id} href={img.file_path} target="_blank" rel="noreferrer">
                        <img src={img.file_path} alt="报告" className="h-16 w-full rounded object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </Fold>

        <Fold title="疫苗记录" count={r.vaccinations.length}>
          {r.vaccinations.length === 0 ? (
            <p className="text-xs text-slate-400">暂无</p>
          ) : (
            r.vaccinations.map((v) => (
              <p key={v.id} className="text-xs text-slate-600">
                {v.vaccine_name} {v.dose_no || ''} · {fmtDate(v.date)} · 下次 {fmtDate(v.next_due_date)}
              </p>
            ))
          )}
        </Fold>

        <Fold title="驱虫记录" count={r.dewormings.length}>
          {r.dewormings.length === 0 ? (
            <p className="text-xs text-slate-400">暂无</p>
          ) : (
            r.dewormings.map((d) => (
              <p key={d.id} className="text-xs text-slate-600">
                {d.type} · {fmtDate(d.date)} · 下次 {fmtDate(d.next_due_date)}
              </p>
            ))
          )}
        </Fold>

        <Fold title="生活照" count={r.photos.length}>
          {r.photos.length === 0 ? (
            <p className="text-xs text-slate-400">暂无</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {r.photos.map((p) => (
                <figure key={p.id}>
                  <a href={p.file_path} target="_blank" rel="noreferrer">
                    <img src={p.file_path} alt={p.caption || '生活照'} className="h-20 w-full rounded object-cover" />
                  </a>
                  {p.caption && <figcaption className="mt-0.5 text-xs text-slate-500">{p.caption}</figcaption>}
                </figure>
              ))}
            </div>
          )}
        </Fold>
      </div>
    </Card>
  );
}

export default function AdminUserDetail() {
  const { id } = useParams();
  const [data, setData] = useState<AdminUserDetailType | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<AdminUserDetailType>(`/admin/users/${id}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'));
  }, [id]);

  if (!data) return error ? <ErrorText>{error}</ErrorText> : <Spinner />;

  return (
    <div className="space-y-4">
      <Link to="/admin" className="text-sm text-slate-500 hover:text-slate-800">
        ← 返回用户列表
      </Link>

      <Card>
        <SectionTitle>用户信息</SectionTitle>
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div>
            <dt className="text-xs text-slate-400">用户名</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{data.user.username}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">注册时间</dt>
            <dd className="mt-0.5 text-slate-800">{fmtDate(data.user.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">宠物数量</dt>
            <dd className="mt-0.5 text-slate-800">{data.pets.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">账号状态</dt>
            <dd className="mt-0.5">
              <Badge className={data.user.status === 'active' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-600'}>
                {data.user.status === 'active' ? '正常' : '已禁用'}
              </Badge>
            </dd>
          </div>
        </dl>
      </Card>

      <p className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-500">
        只读模式：管理员可以查看全部业务数据，但不能编辑或删除用户的宠物档案、记录和照片。
      </p>

      {data.pets.length === 0 ? (
        <Empty text="该用户还没有宠物档案" />
      ) : (
        data.pets.map((pet) => <PetBlock key={pet.id} pet={pet} />)
      )}
    </div>
  );
}
