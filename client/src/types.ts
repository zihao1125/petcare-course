export type Role = 'user' | 'admin';

export interface User {
  id: number;
  account: string;
  username: string;
  role: Role;
  status: 'active' | 'disabled';
  profileCompleted: boolean;
  created_at: string;
}

export interface SecurityQuestion {
  key: string;
  label: string;
}

export interface SecurityAnswer {
  key: string;
  answer: string;
}

export interface RegisterPayload {
  account: string;
  username: string;
  password: string;
  securityQuestions: SecurityAnswer[];
}

export interface PetCounts {
  health: number;
  weights: number;
  visits: number;
  vaccinations: number;
  dewormings: number;
  medications: number;
  photos: number;
}

export type PetTabKey = 'overview' | 'health' | 'visits' | 'prevention' | 'medications' | 'photos';

export interface Pet {
  id: number;
  user_id: number;
  name: string;
  species: 'cat' | 'dog';
  breed?: string | null;
  gender?: string | null;
  birthday?: string | null;
  neutered?: string | null;
  avatar_path?: string | null;
  note?: string | null;
  created_at: string;
  counts?: PetCounts;
}

export interface WeightRecord {
  id: number;
  pet_id: number;
  record_date: string;
  weight_kg: number;
  note?: string | null;
  created_at: string;
}

export interface HealthRecord {
  id: number;
  pet_id: number;
  record_date: string;
  temperature?: number | null;
  appetite?: string | null;
  water_intake?: string | null;
  stool?: string | null;
  urine?: string | null;
  vomiting?: string | null;
  mental_state?: string | null;
  symptoms?: string | null;
  allergy_note?: string | null;
  note?: string | null;
  created_at: string;
}

export interface Medication {
  id: number;
  pet_id: number;
  name: string;
  dosage?: string | null;
  frequency?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  note?: string | null;
  created_at: string;
}

export interface VisitImage {
  id: number;
  file_path: string;
}

export interface Visit {
  id: number;
  pet_id: number;
  visit_date: string;
  hospital?: string | null;
  doctor?: string | null;
  department?: string | null;
  chief_complaint?: string | null;
  diagnosis?: string | null;
  prescription?: string | null;
  cost?: number | null;
  followup_date?: string | null;
  note?: string | null;
  created_at: string;
  images?: VisitImage[];
}

export interface Vaccination {
  id: number;
  pet_id: number;
  vaccine_name: string;
  dose_no?: string | null;
  date: string;
  next_due_date?: string | null;
  note?: string | null;
  created_at: string;
}

export interface Deworming {
  id: number;
  pet_id: number;
  type: string;
  date: string;
  next_due_date?: string | null;
  note?: string | null;
  created_at: string;
}

export interface Photo {
  id: number;
  pet_id: number;
  file_path: string;
  caption?: string | null;
  tags?: string | null;
  created_at: string;
}

export interface Reminder {
  kind: 'vaccination' | 'deworming' | 'followup';
  record_id: number;
  pet_id: number;
  pet_name: string;
  title: string;
  due_date: string;
  days_left: number;
}

export interface AdminUser {
  id: number;
  account: string;
  username: string;
  status: 'active' | 'disabled';
  created_at: string;
  pet_count: number;
}

export interface AdminOverview {
  users: number;
  pets: number;
  active_pets: number;
  records: number;
  due_soon: number;
}

export interface AdminUserDetail {
  user: User;
  pets: Array<
    Pet & {
      records: PetRecords;
    }
  >;
}

export interface PetRecords {
  weights: WeightRecord[];
  health: HealthRecord[];
  medications: Medication[];
  visits: Visit[];
  vaccinations: Vaccination[];
  dewormings: Deworming[];
  photos: Photo[];
}

export interface PetDetailData extends PetRecords {
  pet: Pet;
}

export type ForumAttachmentKind = 'image' | 'video' | 'file';

export interface ForumAttachment {
  id: number;
  url: string;
  name: string;
  kind: ForumAttachmentKind;
  size: number;
}

export interface ForumAuthor {
  id: number;
  username: string;
  role: Role;
}

export interface ForumPost {
  id: number;
  user_id: number;
  title?: string | null;
  content: string;
  created_at: string;
  author: ForumAuthor;
  comment_count: number;
  attachments: ForumAttachment[];
}

export interface ForumComment {
  id: number;
  post_id: number;
  user_id: number;
  parent_id?: number | null;
  content: string;
  created_at: string;
  author: ForumAuthor;
  reply_to?: { id: number; username: string } | null;
}
