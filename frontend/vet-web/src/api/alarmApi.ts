import { apiClient } from "./client";

export type AlarmType =
  | "reservation_confirmed"
  | "reservation_cancelled"
  | "reservation_updated"
  | "chart_ready";

export interface AlarmItem {
  alarmid: number;
  type: AlarmType;
  contents: string;
  scheduleid: number;
  is_read: boolean;
  created_at: string;
}

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
