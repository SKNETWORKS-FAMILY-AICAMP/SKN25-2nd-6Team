import { apiClient } from "./api-client";
import { useAuthStore } from "../stores/auth-store";
import type {
  AvailableScheduleSlotsResponse,
  CancelScheduleResponse,
  ScheduleFilter,
  ScheduleListItem,
  ScheduleListResponse,
  UpdateSchedulePayload,
  UpdateScheduleResponse,
} from "../types/schedule";

export interface GetSchedulesParams {
  filter: ScheduleFilter;
  page: number;
  size: number;
}

const demoGuardianLoginId = "guardian-demo";
const demoSchedulesStorageKey = "medipaw-guardian-demo-schedules";

const toKstIso = (date: Date) => {
  const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${kstDate.toISOString().slice(0, 19)}+09:00`;
};

const createDemoSchedule = (
  schedule: Omit<ScheduleListItem, "confirmed_time" | "confirmed_end_time"> & {
    startOffsetDays: number;
    hour: number;
    minute: number;
  },
): ScheduleListItem => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + schedule.startOffsetDays);
  startDate.setHours(schedule.hour, schedule.minute, 0, 0);

  const endDate = new Date(startDate);
  endDate.setMinutes(endDate.getMinutes() + schedule.duration_min);

  const { startOffsetDays, hour, minute, ...restSchedule } = schedule;

  return {
    ...restSchedule,
    confirmed_time: toKstIso(startDate),
    confirmed_end_time: toKstIso(endDate),
  };
};

const demoSchedules: ScheduleListItem[] = [
  createDemoSchedule({
    schedule_id: 1,
    pet_id: 101,
    pet_profile_image: "/assets/profile1.png",
    pet_name: "모찌",
    breed: "말티즈",
    age: 4,
    gender: "남아",
    category: "피부 진료",
    hospital_name: "행복한 동물병원",
    hospital_address: "서울 강남구 역삼로 123",
    doctorid: 1,
    doctor_name: "김수의사",
    duration_min: 30,
    status: "CONFIRMED",
    startOffsetDays: 1,
    hour: 14,
    minute: 30,
  }),
  createDemoSchedule({
    schedule_id: 2,
    pet_id: 102,
    pet_profile_image: "/assets/profile2.png",
    pet_name: "나비",
    breed: "코리안 숏헤어",
    age: 2,
    gender: "여아",
    category: "예방접종",
    hospital_name: "행복한 동물병원",
    hospital_address: "서울 강남구 역삼로 123",
    doctorid: 1,
    doctor_name: "김수의사",
    duration_min: 30,
    status: "CONFIRMED",
    startOffsetDays: 8,
    hour: 11,
    minute: 0,
  }),
  createDemoSchedule({
    schedule_id: 3,
    pet_id: 103,
    pet_profile_image: "/assets/profile3.png",
    pet_name: "콩이",
    breed: "시츄",
    age: 5,
    gender: "남아",
    category: "건강검진",
    hospital_name: "행복한 동물병원",
    hospital_address: "서울 강남구 역삼로 123",
    doctorid: 2,
    doctor_name: "박수의사",
    duration_min: 30,
    status: "COMPLETED",
    startOffsetDays: -7,
    hour: 15,
    minute: 0,
  }),
  createDemoSchedule({
    schedule_id: 4,
    pet_id: 101,
    pet_profile_image: "/assets/profile1.png",
    pet_name: "모찌",
    breed: "말티즈",
    age: 4,
    gender: "남아",
    category: "정기검진",
    hospital_name: "메디포 동물병원",
    hospital_address: "서울 서초구 반포대로 77",
    doctorid: 2,
    doctor_name: "박수의사",
    duration_min: 30,
    status: "CANCELLED",
    startOffsetDays: -3,
    hour: 10,
    minute: 0,
  }),
  createDemoSchedule({
    schedule_id: 5,
    pet_id: 102,
    pet_profile_image: "/assets/profile2.png",
    pet_name: "나비",
    breed: "코리안 숏헤어",
    age: 2,
    gender: "여아",
    category: "예약 확정 처리",
    hospital_name: "행복한 동물병원",
    hospital_address: "서울 강남구 역삼로 123",
    doctorid: 1,
    doctor_name: "김수의사",
    duration_min: 30,
    status: "PENDING",
    startOffsetDays: 2,
    hour: 9,
    minute: 0,
  }),
];

const isDemoGuardian = () =>
  import.meta.env.DEV &&
  useAuthStore.getState().guardian?.loginid === demoGuardianLoginId;

const readDemoSchedules = () => {
  const storedSchedules = window.localStorage.getItem(demoSchedulesStorageKey);

  if (!storedSchedules) {
    window.localStorage.setItem(
      demoSchedulesStorageKey,
      JSON.stringify(demoSchedules),
    );
    return demoSchedules;
  }

  try {
    return JSON.parse(storedSchedules) as ScheduleListItem[];
  } catch {
    window.localStorage.setItem(
      demoSchedulesStorageKey,
      JSON.stringify(demoSchedules),
    );
    return demoSchedules;
  }
};

const writeDemoSchedules = (schedules: ScheduleListItem[]) => {
  window.localStorage.setItem(demoSchedulesStorageKey, JSON.stringify(schedules));
};

const getFilteredDemoSchedules = (filter: ScheduleFilter) => {
  const now = Date.now();

  return readDemoSchedules()
    .filter((schedule) => {
      if (schedule.status === "PENDING") {
        return false;
      }

      if (filter === "upcoming") {
        return (
          schedule.status === "CONFIRMED" &&
          new Date(schedule.confirmed_time).getTime() > now
        );
      }

      if (filter === "past") {
        return (
          schedule.status === "COMPLETED" ||
          (schedule.status === "CONFIRMED" &&
            new Date(schedule.confirmed_end_time).getTime() < now)
        );
      }

      if (filter === "cancelled") {
        return schedule.status === "CANCELLED";
      }

      return true;
    })
    .sort((firstSchedule, secondSchedule) => {
      const firstTime = new Date(firstSchedule.confirmed_time).getTime();
      const secondTime = new Date(secondSchedule.confirmed_time).getTime();

      return filter === "upcoming"
        ? firstTime - secondTime
        : secondTime - firstTime;
    });
};

export const getSchedules = async ({
  filter,
  page,
  size,
}: GetSchedulesParams): Promise<ScheduleListResponse> => {
  if (isDemoGuardian()) {
    const filteredSchedules = getFilteredDemoSchedules(filter);
    const startIndex = (page - 1) * size;
    const items = filteredSchedules.slice(startIndex, startIndex + size);

    return {
      code: 200,
      message: "예약 목록 조회에 성공했습니다.",
      result: {
        items,
        page,
        size,
        has_next: startIndex + size < filteredSchedules.length,
      },
    };
  }

  const response = await apiClient.get<ScheduleListResponse>("/schedules", {
    params: {
      filter,
      page,
      size,
    },
  });

  return response.data;
};

export interface GetAvailableScheduleSlotsParams {
  date: string;
  doctorid: number;
  duration_min: number;
}

export const getAvailableScheduleSlots = async ({
  date,
  doctorid,
  duration_min,
}: GetAvailableScheduleSlotsParams): Promise<AvailableScheduleSlotsResponse> => {
  if (isDemoGuardian()) {
    return {
      code: 200,
      message: "예약 가능 시간 조회에 성공했습니다.",
      result: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"].map(
        (startTime) => {
          const [hour, minute] = startTime.split(":").map(Number);
          const endDate = new Date(2026, 0, 1, hour, minute + duration_min);

          return {
            start_time: startTime,
            end_time: `${String(endDate.getHours()).padStart(2, "0")}:${String(
              endDate.getMinutes(),
            ).padStart(2, "0")}`,
            doctorid,
            doctor_name: doctorid === 1 ? "김수의사" : "박수의사",
          };
        },
      ),
    };
  }

  const response = await apiClient.get<AvailableScheduleSlotsResponse>(
    "/schedules/available",
    {
      params: {
        date,
        doctorid,
        duration_min,
      },
    },
  );

  return response.data;
};

export const updateSchedule = async (
  scheduleId: number,
  payload: UpdateSchedulePayload,
): Promise<UpdateScheduleResponse> => {
  if (isDemoGuardian()) {
    const schedules = readDemoSchedules();
    const targetSchedule = schedules.find(
      (schedule) => schedule.schedule_id === scheduleId,
    );

    if (!targetSchedule) {
      return {
        code: 404,
        message: "예약 정보를 찾을 수 없습니다.",
      };
    }

    const startDate = new Date(payload.confirmed_time);
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + payload.duration_min);

    writeDemoSchedules(
      schedules.map((schedule) =>
        schedule.schedule_id === scheduleId
          ? {
              ...schedule,
              confirmed_time: payload.confirmed_time,
              confirmed_end_time: toKstIso(endDate),
              duration_min: payload.duration_min,
              status: "CONFIRMED",
            }
          : schedule,
      ),
    );

    return {
      code: 200,
      message: "예약이 변경되었습니다.",
    };
  }

  const response = await apiClient.patch<UpdateScheduleResponse>(
    `/schedules/${scheduleId}`,
    payload,
  );

  return response.data;
};

export const cancelSchedule = async (
  scheduleId: number,
): Promise<CancelScheduleResponse> => {
  if (isDemoGuardian()) {
    const schedules = readDemoSchedules();
    const targetSchedule = schedules.find(
      (schedule) => schedule.schedule_id === scheduleId,
    );

    if (!targetSchedule) {
      return {
        code: 404,
        message: "예약 정보를 찾을 수 없습니다.",
      };
    }

    writeDemoSchedules(
      schedules.map((schedule) =>
        schedule.schedule_id === scheduleId
          ? {
              ...schedule,
              status: "CANCELLED",
            }
          : schedule,
      ),
    );

    return {
      code: 200,
      message: "예약이 취소되었습니다.",
    };
  }

  const response = await apiClient.delete<CancelScheduleResponse>(
    `/schedules/${scheduleId}`,
  );

  return response.data;
};
