import axios from "axios";

export type AlarmType =
  | "reservation_confirmed"
  | "reservation_cancelled"
  | "reservation_updated";

export interface AlarmItem {
  alarmid: number;
  type: AlarmType;
  contents: string;
  scheduleid: number;
  is_read: boolean;
  created_at: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: { "Content-Type": "application/json" },
});

export async function fetchAlarmList(params: {
  accessToken: string;
  page?: number;
}): Promise<AlarmItem[]> {
  const { data } = await apiClient.get<{
    code: number;
    result: { alarm_list: AlarmItem[] };
  }>("/doctor/alarm/list", {
    params: { page: params.page ?? 1 },
    headers: { Authorization: `Bearer ${params.accessToken}` },
  });

  return data.result.alarm_list;
}

export async function markAllAlarmsRead(params: {
  accessToken: string;
}): Promise<void> {
  await apiClient.patch("/doctor/alarm/read-all", null, {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  });
}
