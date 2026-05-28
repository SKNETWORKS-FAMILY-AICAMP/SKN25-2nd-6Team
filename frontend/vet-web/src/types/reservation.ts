export type ModalMode = "add" | "edit" | null;
export type ReservationViewMode = "day" | "week" | "month";

export type ReservationStatus = "emergency" | "semiEmergency" | "normal";

export interface ReservationPatient {
  id: number;
  petName: string;
  guardianName: string;
  phone: string;
  species: "강아지" | "고양이";
  breed: string;
  birthDate: string;
  age: string;
  weight: string;
  gender: "남자" | "여자" | "미상";
  isNeutered: boolean;
  lastCheckupDate: string;
  imageUrl: string;
}

export interface ReservationItem {
  id: number;
  patientId: number;
  date: string;
  start: string;
  end: string;
  status: ReservationStatus;
  visitReason: string;
  doctorName: string;
  memo: string;
}

export interface ReservationFormState {
  date: string;
  dateKey: string;
  time: string;
  doctorName: string;
  memo: string;
}

export type PatientsById = Record<number, ReservationPatient>;

export interface ApiReservation {
  schedule_id: number;
  petid: number;
  pet_name: string;
  species: string;
  breed: string;
  birth_date: string;
  age: string;
  weight_kg: number;
  gender: string;
  is_neutered: boolean;
  profile_image: string | null;
  last_checkup_date: string;
  owner_name: string;
  phone: string;
  doctor_name: string;
  visit_reason: string;
  triage: ReservationStatus;
  date: string;
  start: string;
  end: string;
  duration_min: number;
  memo: string;
  status: string;
}
