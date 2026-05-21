/**
 * useAgentPipeline — 보호자 6-Agent 파이프라인 훅
 *
 * 에이전트 호출 순서와 상태 관리를 담당합니다. 컴포넌트는 UI만 신경 씁니다.
 *
 * 배치 위치: frontend/guardian-web/src/hooks/useAgentPipeline.ts
 *
 * 의존성:
 *   - VITE_API_BASE_URL (env)
 *   - apiClient (src/api/api-client.ts의 axios 인스턴스)
 *   - useAuthStore (src/stores/auth-store.ts)
 *
 * 6개 에이전트:
 *   1. Triage Agent    — 문진 루프 (Modified VTL 5단계)
 *   2. Schedule Agent  — 최적 진료시간 결정
 *   3. Chart Agent     — SOAP 차트 초안 (background)
 *   4. Validation Agent — 정합성 검증 (background)
 *   5. Judge Agent     — 독립 품질 심사 (fire-and-forget)
 *   6. Followup Agent  — 예약 후 경과 모니터링
 */

import { useState, useRef, useCallback } from "react";
import { apiClient } from "../api/api-client";

// ── 타입 정의 ─────────────────────────────────────────────────────

export interface Pet {
  petid?: number;
  name?: string;
  petname?: string;
  breed?: string;
  species?: "dog" | "cat";
  age?: number;
  birth_date?: string;
  gender?: string;
  weight?: number;
  weight_kg?: number;
}

export interface NormalizedPet {
  petid?: number;
  name: string;
  breed: string;
  species: "dog" | "cat";
  age: number;
  gender: string;
  weight: number;
}

export interface TriageInfo {
  is_triage_complete: boolean;
  urgency_level: string;
  urgency_level_num: number;
  vtl_basis: string;
  red_flags: string[];
  is_initial_visit: boolean;
  chief_complaint: string;
  symptom_onset: string;
  symptom_keywords: string[];
  suspected_diseases: string[];
  symptom_summary: string;
  recommended_action: string;
  need_followup: boolean;
  followup_reason: string | null;
  photos?: string[];
  photo_predictions?: PhotoPrediction[];
}

export interface PhotoPrediction {
  photo_idx: number;
  model_type: "skin" | "eye";
  prediction: string | null;
  top_class: string | null;
  top_confidence: number | null;
  details: string[];
}

export interface ScheduleInfo {
  estimated_duration_min: number;
  is_initial_visit: boolean;
  slot_window: string;
  priority_reason: string;
  complexity_factors: string[];
  pre_visit_instructions: string[];
}

export interface AppointmentSlot {
  date: string;
  time: string;
  dateStr?: string;
  duration_min?: number;
}

export interface ChatMessage {
  id: string;
  type: "user" | "bot";
  text: string;
  photo?: string;
  suggestions?: string[];
}

export interface AppointmentConfirmedPayload {
  id: string;
  pet: NormalizedPet;
  triageInfo: TriageInfo | null;
  scheduleInfo: ScheduleInfo | null;
  appointment: AppointmentSlot | null;
  chartData: Record<string, unknown> | null;
  validationResult: Record<string, unknown> | null;
  chatHistory: ChatMessage[];
}

export interface Slot {
  date: string;
  time: string;
  dateStr: string;
  duration_min: number;
  label: string;
}

export type Phase =
  | "pet-select"
  | "triage"
  | "schedule"
  | "confirmed";

// ── 상수 ─────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const MAX_POST_PHOTOS = 3;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const HARD_MAX_TURNS = 7;
const MAX_FOLLOWUP_TURNS = 6;
const MAX_FOLLOWUP_TOTAL_MSGS = 10;
const FOLLOWUP_DONE_MSG = "필요한 경과 내역들이 모두 확인되었습니다. 예약일에 방문해 주세요.";
const QUICK_BOOK_KEYWORDS = ["예약", "빨리", "급해", "충분", "넘어가"];

const FORCE_COMPLETE_SUFFIX = `

[완료 요청]
충분한 턴이 진행되었습니다. 지금까지 수집된 정보로 즉시 완료 형식(is_triage_complete: true, collected_info 포함)으로 응답하세요.
추론으로 정보를 채우지 마세요. 정보가 부족하거나 불확실한 경우: urgency_level_num을 한 단계 높게(보수적으로) 설정하고, 수집되지 않은 문자열 필드는 ""로, 배열 필드는 []로 두세요.`;

const DURATION_FALLBACK: Record<number, number> = { 1: 40, 2: 40, 3: 30, 4: 20, 5: 20 };
const WINDOW_FALLBACK: Record<number, string> = {
  1: "immediate", 2: "emergency_today", 3: "urgent_24h",
  4: "semi_urgent_48h", 5: "routine_72h",
};

// ── 유틸 ─────────────────────────────────────────────────────────

const uid = () => crypto.randomUUID();

function normalizePet(pet: Pet): NormalizedPet {
  const birthDate = pet.birth_date ? new Date(pet.birth_date) : null;
  const age =
    pet.age ??
    (birthDate ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 86400000)) : 0);
  return {
    ...pet,
    name: pet.name ?? pet.petname ?? "알 수 없음",
    breed: pet.breed ?? "알 수 없음",
    age,
    gender: pet.gender ?? "미상",
    weight: pet.weight ?? pet.weight_kg ?? 0,
    species: pet.species ?? "dog",
  };
}

function normalizeValidation(v: Record<string, unknown> | null) {
  if (!v) return v;
  return {
    ...v,
    overall: v.overall ?? v.status ?? "OK",
    checks:
      (v.checks as unknown[]) ??
      ((v.warnings as string[]) ?? []).map((w: string) => ({ item: w, status: "WARN", detail: w })),
    scores: (v.scores as object) ?? {
      completeness: v.completeness ?? 0,
      accuracy: v.accuracy ?? 0,
      consistency: v.consistency ?? 0,
    },
  };
}

function getMaxTurns(urgencyNum?: number): number {
  const map: Record<number, number> = { 1: 2, 2: 2, 3: 4, 4: 6, 5: 6 };
  return Math.min(map[urgencyNum ?? 3] ?? 4, HARD_MAX_TURNS - 1);
}

function wantsQuickBook(text: string): boolean {
  return QUICK_BOOK_KEYWORDS.some((k) => text.includes(k));
}

// ── API 함수 ──────────────────────────────────────────────────────

async function callAgent(messages: object[], systemPrompt: string, maxTokens = 1000, model = "gpt-4o-mini") {
  const { data } = await apiClient.post("/api/agent/chat", {
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    model,
    max_tokens: maxTokens,
    temperature: 0.3,
    json_mode: true,
  });
  const raw: string = data.choices?.[0]?.message?.content ?? "";
  const clean = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    return { raw: clean };
  }
}

async function callAgentOnce(userPrompt: string, systemPrompt: string, maxTokens = 1200, model = "gpt-4o-mini") {
  return callAgent([{ role: "user", content: userPrompt }], systemPrompt, maxTokens, model);
}

async function callAgentWithImage(
  messages: object[],
  systemPrompt: string,
  imageBase64: string,
  maxTokens = 1200,
) {
  const lastMsg = messages[messages.length - 1] as { role: string; content: string };
  const visualMessages = [
    { role: "system", content: systemPrompt },
    ...messages.slice(0, -1),
    {
      role: "user",
      content: [
        { type: "text", text: lastMsg.content },
        { type: "image_url", image_url: { url: imageBase64, detail: "auto" } },
      ],
    },
  ];
  const { data } = await apiClient.post("/api/agent/chat", {
    messages: visualMessages,
    model: "gpt-4o",
    max_tokens: maxTokens,
    temperature: 0.3,
    json_mode: true,
  });
  const raw: string = data.choices?.[0]?.message?.content ?? "";
  const clean = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    return { raw: clean };
  }
}

// ── 슬롯 생성 (실제 배포 시 백엔드 schedule API로 교체) ────────────

function generateSlots(urgencyNum: number, durationMin: number, existingSlots: AppointmentSlot[]): Slot[] {
  const now = new Date();
  const minHoursMap: Record<number, number> = { 1: 0, 2: 2, 3: 24, 4: 48, 5: 72 };
  const minH = minHoursMap[urgencyNum] ?? 24;

  const slots: Slot[] = [];
  const offsets = [minH, minH + 24, minH + 48];

  for (const h of offsets) {
    let t = new Date(now.getTime() + h * 3600000);
    if (t.getHours() < 9) t.setHours(9, 0, 0, 0);
    else if (t.getHours() >= 18) {
      t = new Date(t.getTime() + 86400000);
      t.setHours(9, 0, 0, 0);
    }

    const dateStr = t.toISOString().split("T")[0];
    const timeStr = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
    const label = `${t.getMonth() + 1}월 ${t.getDate()}일 ${timeStr}`;

    const conflict = existingSlots.some(
      (s) => s.dateStr === dateStr && s.time === timeStr,
    );
    if (!conflict) {
      slots.push({ date: dateStr, time: timeStr, dateStr, duration_min: durationMin, label });
    }
  }
  return slots;
}

// ── 훅 인터페이스 ─────────────────────────────────────────────────

export interface UseAgentPipelineOptions {
  triageRules?: Record<string, unknown> | null;
  onAppointmentConfirmed?: (payload: AppointmentConfirmedPayload) => void;
  onChartReady?: (apptId: string, chartData: unknown, validationResult: unknown) => void;
  onPhotoAdded?: (apptId: string, allUrls: string[], allPredictions: PhotoPrediction[]) => void;
  onFollowupUpdate?: (apptId: string, messages: ChatMessage[], summary: string) => void;
  appointmentQueue?: AppointmentConfirmedPayload[];
}

// ── 메인 훅 ──────────────────────────────────────────────────────

export function useAgentPipeline({
  triageRules,
  onAppointmentConfirmed,
  onChartReady,
  onPhotoAdded,
  onFollowupUpdate,
  appointmentQueue = [],
}: UseAgentPipelineOptions) {
  // ── 상태 ───────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("pet-select");
  const [selectedPet, setPet] = useState<NormalizedPet | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [triageInfo, setTriageInfo] = useState<TriageInfo | null>(null);
  const [needPhoto, setNeedPhoto] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);
  const [showCal, setShowCal] = useState(false);

  const [postPhotos, setPostPhotos] = useState<{ url: string; prediction: string | null; details: string[] }[]>([]);
  const [pendingPhoto, setPendingPhoto] = useState<{ file: File; localUrl: string; sizeMB: string } | null>(null);
  const [photoSizeError, setPhotoSizeError] = useState(false);
  const [postPhotoLoading, setPostPhotoLoading] = useState(false);

  const [followupMessages, setFollowupMessages] = useState<ChatMessage[]>([]);
  const [followupInput, setFollowupInput] = useState("");
  const [followupLoading, setFollowupLoading] = useState(false);
  const [emergencyAlert, setEmergencyAlert] = useState(false);
  const [followupDone, setFollowupDone] = useState(false);

  // ── refs ───────────────────────────────────────────────────────
  const apiHistRef = useRef<object[]>([]);
  const turnRef = useRef(0);
  const queueRef = useRef(appointmentQueue);
  queueRef.current = appointmentQueue;
  const bookingRef = useRef<((info: TriageInfo) => void) | null>(null);
  const photoUrlsRef = useRef<string[]>([]);
  const photoPredictionsRef = useRef<PhotoPrediction[]>([]);
  const apptIdRef = useRef<string | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const followupApiHistRef = useRef<object[]>([]);
  const followupSummaryRef = useRef("");
  const followupDbIdRef = useRef<number | null>(null);
  const followupTurnRef = useRef(0);
  const onFollowupUpdateRef = useRef(onFollowupUpdate);
  onFollowupUpdateRef.current = onFollowupUpdate;
  const triageInfoRef = useRef(triageInfo);
  triageInfoRef.current = triageInfo;
  const onPhotoAddedRef = useRef(onPhotoAdded);
  onPhotoAddedRef.current = onPhotoAdded;

  // ── 트리아지 시작 ─────────────────────────────────────────────
  const startTriage = useCallback(async (pet: Pet) => {
    const normalized = normalizePet(pet);
    setPet(normalized);
    setPhase("triage");
    setMessages([]);
    setTriageInfo(null);
    setNeedPhoto(false);
    setSelectedSlot(null);
    setScheduleInfo(null);
    setPostPhotos([]);
    setPendingPhoto(null);
    setPhotoSizeError(false);
    setFollowupMessages([]);
    setFollowupInput("");
    setFollowupLoading(false);
    setEmergencyAlert(false);
    setFollowupDone(false);
    apiHistRef.current = [];
    photoUrlsRef.current = [];
    photoPredictionsRef.current = [];
    apptIdRef.current = null;
    turnRef.current = 0;
    followupApiHistRef.current = [];
    followupSummaryRef.current = "";
    followupDbIdRef.current = null;
    followupTurnRef.current = 0;
    setLoading(false);

    setMessages([{
      id: uid(),
      type: "bot",
      text: `안녕하세요! ${normalized.name}의 상태에 대해 알려주세요. 어떤 증상이 있으신가요?`,
      suggestions: ["구토 / 설사", "기침 / 호흡 곤란", "식욕 감소", "피부 문제", "다리를 절어요"],
    }]);
  }, []);

  // ── 메시지 전송 ───────────────────────────────────────────────
  const sendMessage = useCallback(async (text?: string) => {
    const txt = (text ?? inputText).trim();
    if (!txt || loading) return;
    if (phase === "triage" && turnRef.current >= HARD_MAX_TURNS) return;

    setInputText("");
    setMessages((p) => [...p, { id: uid(), type: "user", text: txt }]);

    if (wantsQuickBook(txt)) {
      setMessages((p) => [...p, { id: uid(), type: "bot", text: "알겠어요! 바로 예약 시간을 찾아볼게요.", suggestions: [] }]);
      if (!triageInfo && apiHistRef.current.length > 0) {
        setLoading(true);
        try {
          const { buildTriageSystemPrompt } = await import("./agentPrompts");
          const sys = buildTriageSystemPrompt(selectedPet!, triageRules) + FORCE_COMPLETE_SUFFIX;
          const forceHist = [...apiHistRef.current, { role: "user", content: txt }];
          const parsed = await callAgent(forceHist, sys, 2000);
          if (parsed.collected_info) {
            const finalInfo = { ...parsed.collected_info, photos: photoUrlsRef.current, photo_predictions: photoPredictionsRef.current };
            setTriageInfo(finalInfo);
            setLoading(false);
            bookingRef.current?.(finalInfo);
            return;
          }
        } catch { /* fallback으로 계속 */ }
        setLoading(false);
      }
      if (!triageInfo) {
        const cnnParts = photoPredictionsRef.current.map((p) => p.prediction).filter(Boolean);
        const fallback: TriageInfo = {
          is_triage_complete: true,
          urgency_level: "응급", urgency_level_num: 2,
          vtl_basis: "문진 미완료 — 보수적 분류 적용",
          red_flags: [], is_initial_visit: true,
          chief_complaint: "빠른 예약 요청(문진 미완료)",
          symptom_onset: "", symptom_keywords: [], suspected_diseases: [],
          symptom_summary: cnnParts.length > 0
            ? `(사진 첨부) AI 모델 분석: ${cnnParts.join(" / ")}. 수의사 추가 문진 필요.`
            : "문진이 완료되지 않은 상태로 예약이 요청되었습니다.",
          recommended_action: "내원 권장", need_followup: false, followup_reason: null,
          photos: photoUrlsRef.current, photo_predictions: photoPredictionsRef.current,
        };
        setTriageInfo(fallback);
        bookingRef.current?.(fallback);
      } else {
        bookingRef.current?.(triageInfo);
      }
      return;
    }

    setLoading(true);
    turnRef.current += 1;
    const maxTurns = getMaxTurns(triageInfo?.urgency_level_num);
    const isLastTurn = turnRef.current >= maxTurns;

    const { buildTriageSystemPrompt } = await import("./agentPrompts");
    const baseSys = buildTriageSystemPrompt(selectedPet!, triageRules);
    const sys = isLastTurn ? baseSys + FORCE_COMPLETE_SUFFIX : baseSys;
    const updated = [...apiHistRef.current, { role: "user", content: txt }];
    apiHistRef.current = updated;

    try {
      const parsed = await callAgent(updated, sys, 2000);
      if (parsed.raw !== undefined) {
        setMessages((p) => [...p, { id: uid(), type: "bot", text: "응답 처리 중 문제가 발생했어요. 다시 말씀해 주세요.", suggestions: [] }]);
        setLoading(false);
        return;
      }
      apiHistRef.current = [...apiHistRef.current, { role: "assistant", content: JSON.stringify(parsed) }];
      setMessages((prev) => [...prev, { id: uid(), type: "bot", text: parsed.message, suggestions: parsed.suggestions ?? [] }]);
      if (parsed.need_photo) setNeedPhoto(true);
      if (parsed.collected_info) {
        const finalInfo = { ...parsed.collected_info, photos: photoUrlsRef.current, photo_predictions: photoPredictionsRef.current };
        setTriageInfo(finalInfo);
        bookingRef.current?.(finalInfo);
      }
    } catch {
      setMessages((p) => [...p, { id: uid(), type: "bot", text: "연결 오류가 발생했어요. 잠시 후 다시 시도해 주세요.", suggestions: [] }]);
    }
    setLoading(false);
  }, [phase, inputText, loading, triageRules, selectedPet, triageInfo]);

  // ── 예약 슬롯 탐색 ────────────────────────────────────────────
  const handleBooking = useCallback(async (infoOverride?: TriageInfo) => {
    const info = infoOverride ?? triageInfo;
    const lv = info?.urgency_level_num ?? 3;
    const isInit = info?.is_initial_visit !== false;

    setLoading(true);
    setMessages((p) => [...p, { id: uid(), type: "bot", text: "예약 가능한 시간을 찾고 있어요 ⏳", suggestions: [] }]);

    const fallbackSchedule: ScheduleInfo = {
      slot_window: WINDOW_FALLBACK[lv] ?? "urgent_24h",
      estimated_duration_min: (DURATION_FALLBACK[lv] ?? 30) + (isInit ? 10 : 0),
      is_initial_visit: isInit,
      priority_reason: `VTL Level ${lv} fallback`,
      complexity_factors: [],
      pre_visit_instructions: [],
    };

    let scheduleRes = fallbackSchedule;
    try {
      const { buildScheduleSystemPrompt } = await import("./agentPrompts");
      const sys = buildScheduleSystemPrompt(selectedPet!, info!);
      const res = await callAgentOnce("최적 진료 일정을 결정해주세요.", sys, 800);
      if (res?.slot_window && res?.estimated_duration_min) scheduleRes = res as ScheduleInfo;
    } catch (e) {
      console.warn("[Schedule] LLM 실패, fallback 사용:", e);
    }
    setScheduleInfo(scheduleRes);

    const existing = (queueRef.current || [])
      .filter((q) => q.appointment?.dateStr && q.appointment?.time)
      .map((q) => q.appointment!);
    setSlots(generateSlots(lv, scheduleRes.estimated_duration_min, existing));
    setPhase("schedule");
    setShowCal(false);
    setLoading(false);
  }, [selectedPet, triageInfo]);

  bookingRef.current = handleBooking;

  // ── 예약 거절 ─────────────────────────────────────────────────
  const handleDeclineBooking = useCallback(() => {
    setMessages((p) => [...p, { id: uid(), type: "bot", text: "알겠어요. 언제든지 필요하시면 말씀해 주세요 😊" }]);
    setPhase("confirmed");
    onAppointmentConfirmed?.({ id: uid(), pet: selectedPet!, triageInfo, scheduleInfo: null, appointment: null, chartData: null, validationResult: null, chatHistory: messagesRef.current });
  }, [selectedPet, triageInfo, scheduleInfo, onAppointmentConfirmed]);

  // ── 예약 확정 ─────────────────────────────────────────────────
  const confirmAppointment = useCallback((slot: AppointmentSlot) => {
    if (phase === "confirmed") return;
    const apptId = uid();
    apptIdRef.current = apptId;
    setSelectedSlot(slot);
    setPhase("confirmed");
    onAppointmentConfirmed?.({ id: apptId, pet: selectedPet!, triageInfo, scheduleInfo, appointment: slot, chartData: null, validationResult: null, chatHistory: messagesRef.current });

    if (triageInfo?.need_followup) {
      const reason = triageInfo.followup_reason ?? "증상 경과 확인";
      setFollowupMessages([{ id: uid(), type: "bot", text: `예약이 완료됐어요. ${reason}을 위해 ${slot.date} 예약일 전까지 증상 변화가 있으면 아래에 알려주세요. 📷 사진도 첨부할 수 있어요.` }]);
    }

    // Chart + Validation 병렬 실행 (background)
    Promise.all([
      (async () => {
        try {
          const { buildValidationSystemPrompt } = await import("./agentPrompts");
          return await callAgentOnce("검증해주세요.", buildValidationSystemPrompt(selectedPet!, triageInfo!, scheduleInfo!), 1200, "gpt-4o");
        } catch (e) { console.warn("[Validation] 실패:", e); return null; }
      })(),
      (async () => {
        try {
          const { buildChartSystemPrompt } = await import("./agentPrompts");
          return await callAgentOnce("SOAP 차트를 생성해주세요.", buildChartSystemPrompt(selectedPet!, triageInfo!), 1800, "gpt-4o");
        } catch (e) { console.warn("[Chart] 실패:", e); return null; }
      })(),
    ]).then(([rawValid, chartRes]) => {
      const validRes = normalizeValidation(rawValid);
      if (validRes?.overall === "WARNING") {
        const warns = (validRes.checks as Array<{ item: string; status: string; detail: string }>).filter((c) => c.status === "WARN");
        console.warn("[Validation] WARNING:", warns.map((c) => `${c.item}: ${c.detail}`));
      }
      onChartReady?.(apptId, chartRes, validRes);

      // Judge Agent fire-and-forget
      (async () => {
        try {
          const { buildJudgeSystemPrompt } = await import("./agentPrompts");
          const judgeResult = await callAgentOnce("평가를 시작합니다.", buildJudgeSystemPrompt(triageInfo, messagesRef.current, chartRes), 1500, "gpt-4o");
          console.info("[Judge] 완료:", judgeResult?.judge_verdict);
          _saveJudgeLog(apptId, triageInfo, judgeResult, selectedPet!);
        } catch (e) { console.warn("[Judge] 오류:", e); }
      })();
    });
  }, [phase, selectedPet, triageInfo, scheduleInfo, onAppointmentConfirmed, onChartReady]);

  // ── Judge 로그 localStorage 저장 ─────────────────────────────
  function _saveJudgeLog(sessionId: string, triage: TriageInfo | null, judgeResult: Record<string, unknown>, pet: NormalizedPet) {
    try {
      const key = "medipaw_judge_log";
      const existing = JSON.parse(localStorage.getItem(key) || "[]") as unknown[];
      existing.push({
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        pet_name: pet?.name ?? "unknown",
        pet_breed: pet?.breed ?? "unknown",
        urgency_level: triage?.urgency_level ?? "unknown",
        urgency_level_num: triage?.urgency_level_num ?? 0,
        judge_scores: judgeResult?.judge_scores ?? {},
        judge_verdict: judgeResult?.judge_verdict ?? "ERROR",
        judge_reasoning: judgeResult?.judge_reasoning ?? "",
        critical_issues: judgeResult?.critical_issues ?? [],
      });
      if (existing.length > 100) existing.splice(0, existing.length - 100);
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (e) {
      console.warn("[Judge] 로그 저장 실패:", e);
    }
  }

  // ── 트리아지 중 사진 업로드 ───────────────────────────────────
  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || loading) return;
    if (turnRef.current >= HARD_MAX_TURNS) { e.target.value = ""; return; }
    turnRef.current += 1;

    const blobUrl = URL.createObjectURL(file);
    setMessages((p) => [...p, { id: uid(), type: "user", text: "📷 사진을 업로드했어요", photo: blobUrl }]);

    const reader = new FileReader();
    reader.onload = async () => {
      setLoading(true);
      photoUrlsRef.current.push(blobUrl);
      const blobIdx = photoUrlsRef.current.length - 1;
      let predictionMsg = "";

      try {
        const authHdr = { Authorization: `Bearer ${localStorage.getItem("token")}` };
        const fd1 = new FormData(); fd1.append("file", file);
        const fd2 = new FormData(); fd2.append("file", file);

        const [skinResult, eyeResult] = await Promise.allSettled([
          fetch(`${BASE_URL}/api/agent/vision/skin`, { method: "POST", headers: authHdr, body: fd1 }).then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch(`${BASE_URL}/api/agent/vision/eye`, { method: "POST", headers: authHdr, body: fd2 }).then((r) => r.ok ? r.json() : null).catch(() => null),
        ]);

        const skinData = skinResult.status === "fulfilled" ? skinResult.value : null;
        const eyeData = eyeResult.status === "fulfilled" ? eyeResult.value : null;
        const imageUrl = skinData?.image_url ?? eyeData?.image_url;

        if (imageUrl) {
          photoUrlsRef.current[blobIdx] = `${BASE_URL}${imageUrl}`;
          setMessages((prev) => prev.map((m) => m.photo === blobUrl ? { ...m, photo: `${BASE_URL}${imageUrl}` } : m));
          URL.revokeObjectURL(blobUrl);
        }

        let skinMsg = "[피부 CNN] 분석 불가";
        if (skinData?.prediction) {
          const isHealthy = skinData.top_class === "healthy";
          const isLowConf = skinData.top_confidence != null && skinData.top_confidence < 70;
          skinMsg = isLowConf
            ? `[피부 CNN] 신뢰도 부족(${skinData.top_confidence.toFixed(1)}%) — 분류 보류`
            : isHealthy
              ? `[피부 CNN] 정상 피부(${skinData.top_confidence?.toFixed(1)}%)`
              : `[피부 CNN] ${skinData.prediction}`;
          photoPredictionsRef.current.push({ photo_idx: blobIdx, model_type: "skin", prediction: skinData.prediction, top_class: skinData.top_class, top_confidence: skinData.top_confidence, details: skinData.details || [] });
        }

        let eyeMsg = "[안구 CNN] 분석 불가";
        if (eyeData?.prediction) {
          const isNormal = eyeData.top_class === "정상";
          const isLowConf = eyeData.top_confidence != null && eyeData.top_confidence < 70;
          eyeMsg = isLowConf
            ? `[안구 CNN] 신뢰도 부족(${eyeData.top_confidence.toFixed(1)}%) — 분류 보류`
            : isNormal
              ? `[안구 CNN] 정상 안구(${eyeData.top_confidence?.toFixed(1)}%)`
              : `[안구 CNN] ${eyeData.prediction}`;
          photoPredictionsRef.current.push({ photo_idx: blobIdx, model_type: "eye", prediction: eyeData.prediction, top_class: eyeData.top_class, top_confidence: eyeData.top_confidence, details: eyeData.details || [] });
        }

        predictionMsg = `\n\n[CNN 분석] ${skinMsg} / ${eyeMsg}\n피부 6종·안구 10종 분류 범위 외 소견은 직접 관찰로 평가합니다.`;
      } catch (err) {
        console.warn("CNN 분석 실패 (blob URL 유지):", err);
      }

      const isPhotoLastTurn = turnRef.current >= Math.min(getMaxTurns(triageInfo?.urgency_level_num), HARD_MAX_TURNS - 1);
      const { buildTriageSystemPrompt } = await import("./agentPrompts");
      const baseSys = buildTriageSystemPrompt(selectedPet!, triageRules);
      const sys = isPhotoLastTurn ? baseSys + FORCE_COMPLETE_SUFFIX : baseSys;
      const userMsg = { role: "user", content: "경과 사진을 첨부했습니다. 사진의 증상을 참고하여 평가해 주세요." + predictionMsg };
      const updated = [...apiHistRef.current, userMsg];
      apiHistRef.current = updated;

      try {
        const parsed = await callAgentWithImage(updated, sys, reader.result as string, 2000);
        apiHistRef.current = [...apiHistRef.current, { role: "assistant", content: JSON.stringify(parsed) }];
        setMessages((prev) => [...prev, { id: uid(), type: "bot", text: parsed.message, suggestions: parsed.suggestions ?? [] }]);
        if (parsed.need_photo === false) setNeedPhoto(false);
        if (parsed.collected_info) {
          const finalInfo = { ...parsed.collected_info, photos: photoUrlsRef.current, photo_predictions: photoPredictionsRef.current };
          setTriageInfo(finalInfo);
          bookingRef.current?.(finalInfo);
        }
      } catch {
        setMessages((p) => [...p, { id: uid(), type: "bot", text: "사진 처리 중 오류가 발생했어요. 텍스트로 증상을 설명해 주세요.", suggestions: [] }]);
      }
      setLoading(false);
    };
    reader.readAsDataURL(file);
  }, [loading, selectedPet, triageRules, triageInfo]);

  // ── 경과 사진 선택/확정/취소 ──────────────────────────────────
  const handlePostPhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (postPhotos.length >= MAX_POST_PHOTOS) return;
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoSizeError(true);
      setTimeout(() => setPhotoSizeError(false), 4000);
      return;
    }
    setPhotoSizeError(false);
    const localUrl = URL.createObjectURL(file);
    setPendingPhoto({ file, localUrl, sizeMB: (file.size / 1024 / 1024).toFixed(1) });
  }, [postPhotos.length]);

  const _syncPostPhotos = useCallback((updated: typeof postPhotos) => {
    const ti = triageInfoRef.current;
    const cb = onPhotoAddedRef.current;
    const allUrls = [...(ti?.photos || []), ...updated.map((p) => p.url)];
    const allPreds = [...(ti?.photo_predictions || []), ...updated.filter((p) => p.details.length > 0).map((p, i) => ({ photo_idx: (ti?.photos?.length ?? 0) + i, model_type: "skin" as const, prediction: p.prediction, top_class: null, top_confidence: null, details: p.details }))];
    cb?.(apptIdRef.current!, allUrls, allPreds);
  }, []);

  const confirmPostPhoto = useCallback(async () => {
    if (!pendingPhoto) return;
    const { file, localUrl } = pendingPhoto;
    setPendingPhoto(null);
    setPostPhotoLoading(true);

    let newPhoto: { url: string; prediction: string | null; details: string[] };
    try {
      const authHdr = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      const fd1 = new FormData(); fd1.append("file", file);
      const fd2 = new FormData(); fd2.append("file", file);
      const [skinResult, eyeResult] = await Promise.allSettled([
        fetch(`${BASE_URL}/api/agent/vision/skin`, { method: "POST", headers: authHdr, body: fd1 }).then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch(`${BASE_URL}/api/agent/vision/eye`, { method: "POST", headers: authHdr, body: fd2 }).then((r) => r.ok ? r.json() : null).catch(() => null),
      ]);
      const skinData = skinResult.status === "fulfilled" ? skinResult.value : null;
      const eyeData = eyeResult.status === "fulfilled" ? eyeResult.value : null;
      const imageUrl = skinData?.image_url ?? eyeData?.image_url;
      const predParts = [skinData?.prediction, eyeData?.prediction].filter(Boolean);
      if (imageUrl) URL.revokeObjectURL(localUrl);
      newPhoto = { url: imageUrl ? `${BASE_URL}${imageUrl}` : localUrl, prediction: predParts.join(" / ") || null, details: [...(skinData?.details || []), ...(eyeData?.details || [])] };
    } catch (e) {
      console.warn("경과 사진 업로드 실패:", e);
      newPhoto = { url: localUrl, prediction: null, details: [] };
    }

    setPostPhotos((prev) => {
      const updated = [...prev, newPhoto];
      _syncPostPhotos(updated);
      return updated;
    });
    setPostPhotoLoading(false);
  }, [pendingPhoto, _syncPostPhotos]);

  const cancelPostPhoto = useCallback(() => {
    if (pendingPhoto?.localUrl) URL.revokeObjectURL(pendingPhoto.localUrl);
    setPendingPhoto(null);
  }, [pendingPhoto]);

  const removePostPhoto = useCallback((index: number) => {
    setPostPhotos((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      _syncPostPhotos(updated);
      return updated;
    });
  }, [_syncPostPhotos]);

  // ── Followup DB 저장 ──────────────────────────────────────────
  const _saveFollowupToDb = useCallback(async (medicalSummary: string, imageUrls: string[] = [], emergencyFlag: boolean = false) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const emrid = typeof apptIdRef.current === "number" ? apptIdRef.current : null;
    if (!emrid) return;

    try {
      if (!followupDbIdRef.current) {
        const res = await apiClient.post("/api/guardian/followup", { emrid, images: imageUrls, medical_summary: medicalSummary, emergency_flag: emergencyFlag });
        if (res.data?.result?.followupid) followupDbIdRef.current = res.data.result.followupid;
      } else {
        await apiClient.patch(`/api/guardian/followup/${followupDbIdRef.current}`, { medical_summary: medicalSummary, emergency_flag: emergencyFlag });
      }
    } catch (err) {
      console.warn("[Followup] DB 저장 실패 (계속):", err);
    }
  }, []);

  // ── 경과 모니터링 텍스트 전송 ─────────────────────────────────
  const sendFollowupMessage = useCallback(async (text?: string) => {
    const txt = (text ?? followupInput).trim();
    if (!txt || followupLoading || followupDone) return;
    setFollowupInput("");
    setFollowupMessages((p) => [...p, { id: uid(), type: "user", text: txt }]);
    setFollowupLoading(true);

    followupTurnRef.current += 1;
    const isLastMsg = followupTurnRef.current >= MAX_FOLLOWUP_TOTAL_MSGS;
    const apiMsg = { role: "user", content: txt };
    const updated = [...followupApiHistRef.current, apiMsg];
    followupApiHistRef.current = updated;
    const trimmed = updated.length > MAX_FOLLOWUP_TURNS ? updated.slice(-MAX_FOLLOWUP_TURNS) : updated;

    try {
      const { buildFollowupSystemPrompt } = await import("./agentPrompts");
      const sys = buildFollowupSystemPrompt(selectedPet!, triageInfo!, selectedSlot, followupSummaryRef.current || null);
      const parsed = await callAgent(trimmed, sys, 800);
      if (!parsed.medical_summary && parsed.followup_summary) parsed.medical_summary = parsed.followup_summary;
      followupApiHistRef.current = [...updated, { role: "assistant", content: JSON.stringify(parsed) }];
      if (parsed.emergency_alert) setEmergencyAlert(true);

      setFollowupMessages((prev) => {
        const botMsg: ChatMessage = { id: uid(), type: "bot", text: parsed.message };
        const next = [...prev, botMsg];
        if (parsed.medical_summary) {
          followupSummaryRef.current = parsed.medical_summary;
          onFollowupUpdateRef.current?.(apptIdRef.current!, next, parsed.medical_summary);
          _saveFollowupToDb(parsed.medical_summary, [], parsed.emergency_alert ?? false);
        }
        return isLastMsg ? [...next, { id: uid(), type: "bot", text: FOLLOWUP_DONE_MSG }] : next;
      });
      if (isLastMsg) setFollowupDone(true);
    } catch {
      setFollowupMessages((p) => [...p, { id: uid(), type: "bot", text: "오류가 발생했어요. 잠시 후 다시 시도해 주세요." }]);
    }
    setFollowupLoading(false);
  }, [followupInput, followupLoading, followupDone, selectedPet, triageInfo, selectedSlot, _saveFollowupToDb]);

  // ── 경과 모니터링 사진 업로드 ─────────────────────────────────
  const handleFollowupPhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || followupLoading || followupDone) return;

    const blobUrl = URL.createObjectURL(file);
    setFollowupMessages((p) => [...p, { id: uid(), type: "user", text: "📷 경과 사진을 보냈어요", photo: blobUrl }]);
    followupTurnRef.current += 1;
    const isLastMsg = followupTurnRef.current >= MAX_FOLLOWUP_TOTAL_MSGS;

    const reader = new FileReader();
    reader.onload = async () => {
      setFollowupLoading(true);
      let predictionMsg = "";
      let finalPhotoUrl = blobUrl;

      try {
        const authHdr = { Authorization: `Bearer ${localStorage.getItem("token")}` };
        const fd1 = new FormData(); fd1.append("file", file);
        const fd2 = new FormData(); fd2.append("file", file);
        const [skinResult, eyeResult] = await Promise.allSettled([
          fetch(`${BASE_URL}/api/agent/vision/skin`, { method: "POST", headers: authHdr, body: fd1 }).then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch(`${BASE_URL}/api/agent/vision/eye`, { method: "POST", headers: authHdr, body: fd2 }).then((r) => r.ok ? r.json() : null).catch(() => null),
        ]);
        const skinData = skinResult.status === "fulfilled" ? skinResult.value : null;
        const eyeData = eyeResult.status === "fulfilled" ? eyeResult.value : null;
        const imageUrl = skinData?.image_url ?? eyeData?.image_url;
        if (imageUrl) {
          finalPhotoUrl = `${BASE_URL}${imageUrl}`;
          setFollowupMessages((p) => p.map((m) => m.photo === blobUrl ? { ...m, photo: finalPhotoUrl } : m));
          URL.revokeObjectURL(blobUrl);
        }
        const parts = [skinData?.prediction && `[피부 CNN] ${skinData.prediction}`, eyeData?.prediction && `[안구 CNN] ${eyeData.prediction}`].filter(Boolean);
        if (parts.length) predictionMsg = `\n\n${parts.join(" / ")}`;
      } catch (err) { console.warn("[Followup] 사진 분석 실패:", err); }

      const apiMsg = { role: "user", content: `경과 사진을 보냈습니다.${predictionMsg}` };
      const updated = [...followupApiHistRef.current, apiMsg];
      followupApiHistRef.current = updated;
      const trimmed = updated.length > MAX_FOLLOWUP_TURNS ? updated.slice(-MAX_FOLLOWUP_TURNS) : updated;

      try {
        const { buildFollowupSystemPrompt } = await import("./agentPrompts");
        const sys = buildFollowupSystemPrompt(selectedPet!, triageInfo!, selectedSlot, followupSummaryRef.current || null);
        const parsed = await callAgentWithImage(trimmed, sys, reader.result as string, 1200);
        if (!parsed.medical_summary && parsed.followup_summary) parsed.medical_summary = parsed.followup_summary;
        followupApiHistRef.current = [...updated, { role: "assistant", content: JSON.stringify(parsed) }];
        if (parsed.emergency_alert) setEmergencyAlert(true);
        setFollowupMessages((prev) => {
          const botMsg: ChatMessage = { id: uid(), type: "bot", text: parsed.message };
          const next = [...prev, botMsg];
          if (parsed.medical_summary) {
            followupSummaryRef.current = parsed.medical_summary;
            onFollowupUpdateRef.current?.(apptIdRef.current!, next, parsed.medical_summary);
          }
          _saveFollowupToDb(parsed.medical_summary ?? followupSummaryRef.current ?? null, [finalPhotoUrl], parsed.emergency_alert ?? false);
          return isLastMsg ? [...next, { id: uid(), type: "bot", text: FOLLOWUP_DONE_MSG }] : next;
        });
        if (isLastMsg) setFollowupDone(true);
      } catch {
        setFollowupMessages((p) => [...p, { id: uid(), type: "bot", text: "사진 처리 중 오류가 발생했어요." }]);
      }
      setFollowupLoading(false);
    };
    reader.readAsDataURL(file);
  }, [followupLoading, followupDone, selectedPet, triageInfo, selectedSlot, _saveFollowupToDb]);

  // 백엔드에서 실제 emrid 받으면 이 함수로 교체 — followup DB save 활성화
  const setRealEmrId = useCallback((emrid: number) => {
    apptIdRef.current = emrid.toString();
  }, []);

  // ── 반환 ──────────────────────────────────────────────────────
  return {
    phase, selectedPet, messages, inputText, setInputText,
    loading, triageInfo, needPhoto,
    slots, scheduleInfo, selectedSlot, showCal, setShowCal,
    postPhotos, pendingPhoto, photoSizeError, postPhotoLoading,
    followupMessages, followupInput, setFollowupInput,
    followupLoading, emergencyAlert, followupDone,
    startTriage, sendMessage,
    handleBooking, handleDeclineBooking,
    confirmAppointment, handlePhotoUpload,
    handlePostPhotoSelect, confirmPostPhoto, cancelPostPhoto, removePostPhoto,
    sendFollowupMessage, handleFollowupPhotoUpload,
    setRealEmrId,
  };
}

// ── Judge 로그 조회 유틸 (VetDashboard Judge 탭용) ────────────────
export function getJudgeLogs(): unknown[] {
  try {
    return JSON.parse(localStorage.getItem("medipaw_judge_log") || "[]");
  } catch {
    return [];
  }
}

export function getJudgeStats() {
  const logs = getJudgeLogs() as Array<{ judge_scores: Record<string, number>; judge_verdict: string; urgency_level: string }>;
  if (!logs.length) return null;
  const avg = (key: string) => logs.reduce((a, l) => a + (l.judge_scores?.[key] || 0), 0) / logs.length;
  return {
    total_sessions: logs.length,
    avg_completeness: avg("completeness").toFixed(2),
    avg_accuracy: avg("accuracy").toFixed(2),
    avg_consistency: avg("consistency").toFixed(2),
    verdicts: logs.reduce((acc: Record<string, number>, l) => { acc[l.judge_verdict] = (acc[l.judge_verdict] || 0) + 1; return acc; }, {}),
  };
}
