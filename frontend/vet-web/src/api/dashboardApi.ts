import axios, { AxiosError } from "axios";

export type VisitType = "emergency" | "semiEmergency" | "normal" | "checkup";

export interface DashboardScheduleItem {
  id: number;
  start: string;
  end: string;
  patientName: string;
  species: string;
  breed: string;
  age: string;
  weight: string;
  reason: string;
  type: VisitType;
  status: string;
}

export interface DashboardSummaries {
  total: number;
  waiting: number;
  emergency: number;
  completed: number;
}

export interface TodayDashboardResult {
  summaries: DashboardSummaries;
  schedules: DashboardScheduleItem[];
}

interface TodayDashboardResponse {
  code: number;
  result: TodayDashboardResult;
}

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? "/api";

export async function getTodayDashboard(
  accessToken: string,
  date: string
): Promise<TodayDashboardResult> {
  const { data } = await axios.get<TodayDashboardResponse>(
    `${BASE_URL}/dashboard/today`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { date },
    }
  );

  if (data.code !== 200) {
    throw new Error("대시보드 조회에 실패했습니다.");
  }

  return data.result;
}

export function getDashboardApiErrorStatus(err: unknown) {
  return axios.isAxiosError(err) ? err.response?.status : undefined;
}

export function getDashboardApiErrorMessage(err: unknown) {
  if (!axios.isAxiosError(err)) {
    return err instanceof Error
      ? err.message
      : "대시보드 데이터를 불러오지 못했습니다.";
  }

  const axiosError = err as AxiosError<{
    message?: string;
    detail?: string;
    error?: string;
  }>;

  if (axiosError.response?.status === 401) {
    return "로그인 세션이 만료되었습니다. 다시 로그인해주세요.";
  }

  if (!axiosError.response) {
    return `백엔드 서버에 연결할 수 없습니다. ${BASE_URL} 서버가 실행 중인지 확인해주세요.`;
  }

  return (
    axiosError.response.data?.message ??
    axiosError.response.data?.detail ??
    axiosError.response.data?.error ??
    "대시보드 데이터를 불러오지 못했습니다."
  );
}
