import type { PatientListItemResponse } from "../api/patientApi";
import type {
  ApiReservation,
  PatientsById,
  ReservationItem,
  ReservationPatient,
  ReservationStatus,
  ReservationViewMode,
} from "../types/reservation";

export const reservationStatusMeta: Record<
  ReservationStatus,
  { label: string; badgeClass: string; softClass: string }
> = {
  emergency: {
    label: "응급",
    badgeClass: "bg-[#fdecee] text-[#c95f69]",
    softClass: "bg-[#fdecee] text-[#c95f69]",
  },
  semiEmergency: {
    label: "준응급",
    badgeClass: "bg-[#fff0df] text-[#c87832]",
    softClass: "bg-[#fff0df] text-[#c87832]",
  },
  normal: {
    label: "일반",
    badgeClass: "bg-[#edf4ff] text-[#4b76c8]",
    softClass: "bg-[#edf4ff] text-[#4b76c8]",
  },
};

export const reservationTimes = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

export const DEFAULT_PET_IMAGE =
  "https://images.unsplash.com/photo-1583511655826-05700d52f4d9?auto=format&fit=crop&w=240&q=80";

export const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];
export const weekDayLabels = ["월", "화", "수", "목", "금", "토", "일"];

export const statusOrder: ReservationStatus[] = [
  "emergency",
  "semiEmergency",
  "normal",
];

export const weeklyCardClass: Record<ReservationStatus, string> = {
  emergency: "border-[#f4cfd5] bg-[#fffafb] text-[#20283a] before:bg-[#e7a6af]",
  semiEmergency: "border-[#f3d8bc] bg-[#fffaf4] text-[#20283a] before:bg-[#e8b77f]",
  normal: "border-[#cedcf5] bg-[#fbfdff] text-[#20283a] before:bg-[#9eb8ea]",
};

export const weeklyBadgeClass: Record<ReservationStatus, string> = {
  emergency: "bg-[#fdecee] text-[#c95f69]",
  semiEmergency: "bg-[#fff0df] text-[#c87832]",
  normal: "bg-[#edf4ff] text-[#4b76c8]",
};

const koreanHolidays: Record<string, string> = {
  "2026-01-01": "신정",
  "2026-02-16": "설날",
  "2026-02-17": "설날",
  "2026-02-18": "설날",
  "2026-03-01": "삼일절",
  "2026-03-02": "대체공휴일",
  "2026-05-01": "근로자의날",
  "2026-05-05": "어린이날",
  "2026-05-24": "부처님오신날",
  "2026-05-25": "대체공휴일",
  "2026-06-03": "전국동시지방선거",
  "2026-06-06": "현충일",
  "2026-07-17": "제헌절",
  "2026-08-15": "광복절",
  "2026-08-17": "대체공휴일",
  "2026-09-24": "추석",
  "2026-09-25": "추석",
  "2026-09-26": "추석",
  "2026-10-03": "개천절",
  "2026-10-05": "대체공휴일",
  "2026-10-09": "한글날",
  "2026-12-25": "성탄절",
  "2027-01-01": "신정",
  "2027-02-06": "설날",
  "2027-02-07": "설날",
  "2027-02-08": "설날",
  "2027-02-09": "대체공휴일",
  "2027-03-01": "삼일절",
  "2027-05-01": "근로자의날",
  "2027-05-05": "어린이날",
  "2027-05-13": "부처님오신날",
  "2027-06-06": "현충일",
  "2027-07-17": "제헌절",
  "2027-08-15": "광복절",
  "2027-08-16": "대체공휴일",
  "2027-09-14": "추석",
  "2027-09-15": "추석",
  "2027-09-16": "추석",
  "2027-10-03": "개천절",
  "2027-10-04": "대체공휴일",
  "2027-10-09": "한글날",
  "2027-10-11": "대체공휴일",
  "2027-12-25": "성탄절",
  "2027-12-27": "대체공휴일",
};

export function dotDate(value: string) {
  return value ? value.replace(/-/g, ".") : "";
}

export function formatGender(value?: string): ReservationPatient["gender"] {
  const normalized = (value ?? "").toLowerCase();

  if (["female", "f", "여아", "여자", "암컷"].includes(normalized)) {
    return "여자";
  }

  if (["male", "m", "남아", "남자", "수컷"].includes(normalized)) {
    return "남자";
  }

  return "미상";
}

export function mapApiReservations(items: ApiReservation[]): {
  reservations: ReservationItem[];
  patientsById: PatientsById;
} {
  const reservations: ReservationItem[] = [];
  const patientsById: PatientsById = {};

  for (const item of items) {
    reservations.push({
      id: item.schedule_id,
      patientId: item.petid,
      date: item.date,
      start: item.start,
      end: item.end,
      status: item.triage ?? "normal",
      visitReason: item.visit_reason,
      doctorName: item.doctor_name,
      memo: item.memo,
    });

    if (!patientsById[item.petid]) {
      patientsById[item.petid] = {
        id: item.petid,
        petName: item.pet_name,
        guardianName: item.owner_name,
        phone: item.phone,
        species: item.species === "고양이" ? "고양이" : "강아지",
        breed: item.breed,
        birthDate: dotDate(item.birth_date),
        age: item.age,
        weight: item.weight_kg ? `${item.weight_kg}kg` : "",
        gender: formatGender(item.gender),
        isNeutered: item.is_neutered,
        lastCheckupDate: dotDate(item.last_checkup_date),
        imageUrl: item.profile_image || DEFAULT_PET_IMAGE,
      };
    }
  }

  return { reservations, patientsById };
}

export function mapPatientListItemToReservationPatient(
  item: PatientListItemResponse
): ReservationPatient {
  return {
    id: item.petid,
    petName: item.petname,
    guardianName: item.owner_name,
    phone: item.phone,
    species: "강아지",
    breed: item.breed,
    birthDate: "",
    age: item.age,
    weight: "",
    gender: "미상",
    isNeutered: false,
    lastCheckupDate: dotDate(item.last_visit_date),
    imageUrl: DEFAULT_PET_IMAGE,
  };
}

export function getReservationAt(reservations: ReservationItem[], start: string) {
  return reservations.find((reservation) => reservation.start === start);
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export const TODAY = startOfDay(new Date());

export function addDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

export function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function isSameDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getMonday(date: Date) {
  const target = startOfDay(date);
  const day = target.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(target, diff);
}

export function getWeekDays(date: Date) {
  const monday = getMonday(date);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function getMonthGrid(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const gridStart = addDays(firstDay, -firstDay.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

export function formatDateWithWeekday(date: Date) {
  return `${formatDate(date)} (${dayLabels[date.getDay()]})`;
}

export function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatMonthTitle(date: Date) {
  return `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(2, "0")}월`;
}

export function formatWeekRange(date: Date) {
  const days = getWeekDays(date);
  return `${formatDateWithWeekday(days[0])} ~ ${formatDateWithWeekday(days[6])}`;
}

export function getControlLabel(
  viewMode: ReservationViewMode,
  selectedDate: Date
) {
  if (viewMode === "week") {
    return formatWeekRange(selectedDate);
  }

  if (viewMode === "month") {
    return formatMonthTitle(selectedDate);
  }

  return formatDateWithWeekday(selectedDate);
}

export function getHolidayName(date: Date) {
  return koreanHolidays[getDateKey(date)];
}
