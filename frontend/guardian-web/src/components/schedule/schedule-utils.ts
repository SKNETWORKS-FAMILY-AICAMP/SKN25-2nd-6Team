import { isAxiosError } from "axios";

import type {
  ApiErrorResponse,
  ScheduleFilter,
  ScheduleListItem,
  ScheduleStatus,
} from "../../types/schedule";

export const pageSize = 10;
const kstOffset = "+09:00";

const defaultProfileImages = [
  "/assets/profile1.png",
  "/assets/profile2.png",
  "/assets/profile3.png",
  "/assets/profile4.png",
  "/assets/profile5.png",
  "/assets/profile6.png",
];

export const scheduleTabs: Array<{ filter: ScheduleFilter; label: string }> = [
  { filter: "all", label: "전체" },
  { filter: "upcoming", label: "예정된 예약" },
  { filter: "past", label: "지난 예약" },
  { filter: "cancelled", label: "취소된 예약" },
];

export const scheduleStatusLabel: Record<ScheduleStatus, string> = {
  PENDING: "예약 대기",
  CONFIRMED: "예약 확정",
  COMPLETED: "진료 완료",
  CANCELLED: "예약 취소",
};

export const getErrorMessage = (
  error: unknown,
  fallbackMessage: string,
) => {
  if (isAxiosError<ApiErrorResponse | string>(error)) {
    const responseData = error.response?.data;

    if (typeof responseData === "string") {
      try {
        return (
          (JSON.parse(responseData) as ApiErrorResponse).message ||
          fallbackMessage
        );
      } catch {
        return fallbackMessage;
      }
    }

    return responseData?.message || fallbackMessage;
  }

  return fallbackMessage;
};

export const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const formatScheduleDateTime = (isoDate: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoDate));

export const formatScheduleTimeRange = (
  startTime: string,
  endTime: string,
) => {
  const end = new Date(endTime);

  return `${formatScheduleDateTime(startTime)} - ${String(
    end.getHours(),
  ).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
};

export const getProfileImage = (schedule: ScheduleListItem) =>
  schedule.pet_profile_image ||
  defaultProfileImages[Math.abs(schedule.pet_id) % defaultProfileImages.length];

export const canManageSchedule = (schedule: ScheduleListItem) =>
  schedule.status === "CONFIRMED" && new Date(schedule.confirmed_time) > new Date();

export const buildKstDateTime = (date: string, time: string) =>
  `${date}T${time}:00${kstOffset}`;