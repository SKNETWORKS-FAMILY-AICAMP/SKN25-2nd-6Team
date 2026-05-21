export type ScheduleStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";

export type ScheduleFilter = "all" | "upcoming" | "past" | "cancelled";

export interface ScheduleListItem {
  schedule_id: number;
  pet_id: number;
  pet_profile_image: string | null;
  pet_name: string;
  breed: string;
  age: number;
  gender: string;
  category: string;
  confirmed_time: string;
  confirmed_end_time: string;
  hospital_name: string;
  hospital_address: string;
  doctorid: number;
  doctor_name: string;
  duration_min: number;
  status: ScheduleStatus;
}

export interface ScheduleListResult {
  items: ScheduleListItem[];
  page: number;
  size: number;
  has_next: boolean;
}

export interface ScheduleListResponse {
  code: number;
  message?: string;
  result: ScheduleListResult;
}

export interface AvailableScheduleSlot {
  start_time: string;
  end_time: string;
  doctorid?: number;
  doctor_name?: string;
}

export interface AvailableScheduleSlotsResponse {
  code: number;
  message?: string;
  result: AvailableScheduleSlot[];
}

export interface CheckupReservationPayload {
  pet_id: number;
  date: string;
  time: string;
  memo: string;
}

export interface CheckupReservationResult {
  schedule_id: number;
  pet_name?: string;
  category?: string;
  date: string;
  time: string;
  end_time: string;
  duration_min: number;
  memo: string;
}

export interface CheckupReservationResponse {
  code: number;
  message: string;
  result?: CheckupReservationResult;
}

export interface UpdateSchedulePayload {
  confirmed_time: string;
  duration_min: number;
}

export interface UpdateScheduleResponse {
  code: number;
  message: string;
}

export interface CancelScheduleResponse {
  code: number;
  message: string;
}

export interface ApiErrorResponse {
  code?: number;
  message?: string;
}
