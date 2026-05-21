import { apiClient } from "./api-client";
import type {
  AvailableScheduleSlotsResponse,
  CancelScheduleResponse,
  CheckupReservationPayload,
  CheckupReservationResponse,
  ScheduleFilter,
  ScheduleListResponse,
  UpdateSchedulePayload,
  UpdateScheduleResponse,
} from "../types/schedule";

export interface GetSchedulesParams {
  filter: ScheduleFilter;
  page: number;
  size: number;
}

export interface GetAvailableScheduleSlotsParams {
  date: string;
  doctorid?: number;
  duration_min: number;
}

export const getSchedules = async ({
  filter,
  page,
  size,
}: GetSchedulesParams): Promise<ScheduleListResponse> => {
  const response = await apiClient.get<ScheduleListResponse>("/schedules", {
    params: {
      filter,
      page,
      size,
    },
  });

  return response.data;
};

export const getAvailableScheduleSlots = async ({
  date,
  doctorid,
  duration_min,
}: GetAvailableScheduleSlotsParams): Promise<AvailableScheduleSlotsResponse> => {
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

export const reserveCheckupSchedule = async (
  payload: CheckupReservationPayload,
): Promise<CheckupReservationResponse> => {
  const response = await apiClient.put<CheckupReservationResponse>(
    "/schedules/checkup",
    payload,
  );

  return response.data;
};

export const updateSchedule = async (
  scheduleId: number,
  payload: UpdateSchedulePayload,
): Promise<UpdateScheduleResponse> => {
  const response = await apiClient.patch<UpdateScheduleResponse>(
    `/schedules/${scheduleId}`,
    payload,
  );

  return response.data;
};

export const cancelSchedule = async (
  scheduleId: number,
): Promise<CancelScheduleResponse> => {
  const response = await apiClient.delete<CancelScheduleResponse>(
    `/schedules/${scheduleId}`,
  );

  return response.data;
};
