import { apiClient } from "./client";
import type { EmrResult, QueuePatient } from "../types/emr";

// ──────────────────────────────────────────────
// Response types
// ──────────────────────────────────────────────

export interface EmrQueueResponse {
  code: number;
  result: {
    waiting: QueuePatient[];
    completed: QueuePatient[];
  };
}

export interface EmrDetailResponse {
  code: number;
  result: EmrResult;
}

export interface TriageResultResponse {
  code: number;
  result: {
    id: number;
    emrid: number;
    urgency_level: string;
    urgency_level_num: number;
    vtl_basis: string | null;
    red_flags: string[] | null;
    chief_complaint: string | null;
    symptom_onset: string | null;
    symptom_keywords: string[] | null;
    suspected_diseases: string[] | null;
    symptom_summary: string | null;
    recommended_action: string | null;
    need_photo: boolean | null;
    created_at: string | null;
  } | null;
}

export interface ReportResultResponse {
  code: number;
  result: {
    reportid: number;
    emrid: number;
    scheduleid: number | null;
    medical_analysis: string | null;
    ai_draft_json: Record<string, unknown> | null;
    status: string;
  } | null;
}

export interface ValidationResultResponse {
  code: number;
  result: {
    id: number;
    emrid: number;
    scheduleid: number | null;
    overall: string;
    checks: Record<string, unknown> | null;
    completeness_score: number | null;
    accuracy_score: number | null;
    consistency_score: number | null;
    summary: string | null;
    created_at: string | null;
  } | null;
}

export interface FollowupItem {
  followup_id: number;
  emrid: number;
  images: string[];
  message: string | null;
  ai_summary?: string | null;
  emergency_alert?: boolean | null;
  created_at: string | null;
}

// ──────────────────────────────────────────────
// 1순위: EMR Queue
// ──────────────────────────────────────────────

export async function fetchEmrQueue(params: {
  accessToken: string;
  date?: string;
}): Promise<{ waiting: QueuePatient[]; completed: QueuePatient[] }> {
  const { data } = await apiClient.get<EmrQueueResponse>("/doctor/emr/queue", {
    headers: { Authorization: `Bearer ${params.accessToken}` },
    params: params.date ? { date: params.date } : undefined,
  });
  return data.result;
}

export async function fetchEmrDetail(params: {
  accessToken: string;
  scheduleId: number;
}): Promise<EmrResult> {
  const { data } = await apiClient.get<EmrDetailResponse>(
    `/doctor/emr/queue/${params.scheduleId}`,
    { headers: { Authorization: `Bearer ${params.accessToken}` } }
  );
  return data.result;
}

// ──────────────────────────────────────────────
// 3순위: AI SOAP 초안
// ──────────────────────────────────────────────

export async function fetchEmrReport(params: {
  accessToken: string;
  scheduleId: number;
}): Promise<ReportResultResponse["result"]> {
  const { data } = await apiClient.get<ReportResultResponse>(
    `/doctor/emr/${params.scheduleId}/report`,
    { headers: { Authorization: `Bearer ${params.accessToken}` } }
  );
  return data.result;
}

// ──────────────────────────────────────────────
// 4순위: 트리아지 결과
// ──────────────────────────────────────────────

export async function fetchEmrTriage(params: {
  accessToken: string;
  scheduleId: number;
}): Promise<TriageResultResponse["result"]> {
  const { data } = await apiClient.get<TriageResultResponse>(
    `/doctor/emr/${params.scheduleId}/triage`,
    { headers: { Authorization: `Bearer ${params.accessToken}` } }
  );
  return data.result;
}

// ──────────────────────────────────────────────
// 5순위: 검증 결과
// ──────────────────────────────────────────────

export async function fetchEmrValidation(params: {
  accessToken: string;
  scheduleId: number;
}): Promise<ValidationResultResponse["result"]> {
  const { data } = await apiClient.get<ValidationResultResponse>(
    `/doctor/emr/${params.scheduleId}/validation`,
    { headers: { Authorization: `Bearer ${params.accessToken}` } }
  );
  return data.result;
}

// ──────────────────────────────────────────────
// 6순위: 경과 모니터링 (수의사 뷰)
// ──────────────────────────────────────────────

export async function fetchDoctorFollowup(params: {
  accessToken: string;
  emrid: number;
}): Promise<FollowupItem[]> {
  const { data } = await apiClient.get<{ code: number; result: FollowupItem[] }>(
    `/doctor/emr/followup/${params.emrid}`,
    { headers: { Authorization: `Bearer ${params.accessToken}` } }
  );
  return data.result;
}
