import axios, { AxiosError } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

const patientApiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface PatientListItemResponse {
  petid: number;
  petname: string;
  age: string;
  owner_name: string;
  phone: string;
  breed: string;
  last_visit_date: string;
  memo: string;
}

export interface PatientListResponse {
  code: number;
  result: {
    total_count?: number;
    patient_list: PatientListItemResponse[];
    pagination?: {
      current_page: number;
      total_page: number;
    };
  };
}

export interface PatientDetailResponse {
  code: number;
  result: {
    patient_info: {
      petid: number;
      petname: string;
      species: "강아지" | "고양이" | string;
      breed: string;
      gender: "male" | "female" | string;
      birth_date: string;
      age: string;
      weight_kg: number;
      owner_name: string;
      phone: string;
      address: string;
      notes: string;
      profile_image?: string;
    };
    emr_history: Array<{
      doctor_emrid: number;
      visit_date: string;
      doctor_name: string;
      status: "treatment" | "vaccination" | "checkup" | string;
      chief_complaint: string;
      soap: {
        subjective?: string;
        objective?: string;
        assessment?: string;
        plan?: string;
      };
      prescription: Array<{
        drug_name: string;
        dosage: string;
        frequency: string;
        duration_days: number;
      }>;
    }>;
  };
}

export async function fetchDoctorPatientList(params: {
  accessToken: string;
  page: number;
  keyword?: string;
  species?: string;
}) {
  const { data } = await patientApiClient.get<PatientListResponse>(
    "/doctor/patient/list",
    {
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
      },
      params: {
        page: params.page,
        keyword: params.keyword || undefined,
        species: params.species || undefined,
      },
    }
  );

  if (data.code !== 200) {
    throw new Error("환자 목록 조회에 실패했습니다.");
  }

  return data.result;
}

export async function fetchDoctorPatientDetail(params: {
  accessToken: string;
  petid: number;
}) {
  const { data } = await patientApiClient.get<PatientDetailResponse>(
    `/doctor/patient/${params.petid}`,
    {
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
      },
    }
  );

  if (data.code !== 200) {
    throw new Error("환자 상세 조회에 실패했습니다.");
  }

  return data.result;
}

export function getPatientApiErrorMessage(err: unknown, fallbackMessage: string) {
  if (!axios.isAxiosError(err)) {
    return err instanceof Error ? err.message : fallbackMessage;
  }

  const axiosError = err as AxiosError<{
    message?: string;
    detail?: string;
    error?: string;
  }>;

  if (axiosError.response?.status === 401) {
    return "세션이 만료되었습니다. 다시 로그인해주세요.";
  }

  if (axiosError.response?.status === 403) {
    return "환자 관리 화면에 접근할 권한이 없습니다.";
  }

  if (!axiosError.response) {
    return `백엔드 서버에 연결할 수 없습니다. ${API_BASE_URL} 서버가 실행 중인지 확인해주세요.`;
  }

  return (
    axiosError.response.data?.message ??
    axiosError.response.data?.detail ??
    axiosError.response.data?.error ??
    fallbackMessage
  );
}

