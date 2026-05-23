import { useRef, useState } from "react";

import { runAgentTask, streamAgentResult } from "../api/agent-api";
import {
  getAvailableScheduleSlots,
  reserveCheckupSchedule,
} from "../api/schedule-api";
import type { Pet } from "../api/pets-api";
import type { ChatMessage } from "./use-chat-conversation";

export type PipelinePhase =
  | "chatting"
  | "scheduling"
  | "slot-selection"
  | "booking"
  | "confirmed"
  | "followup";

interface AgentPet {
  name: string;
  species: string;
  breed: string;
  age: number | string;
  gender: string;
  weight: number | string;
}

interface UseAgentPipelineParams {
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setQuickReplies: React.Dispatch<React.SetStateAction<string[]>>;
  setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>;
}

const toPetPayload = (pet: Pet): AgentPet => {
  const age = pet.birth_date
    ? new Date().getFullYear() - new Date(pet.birth_date).getFullYear()
    : "?";
  return {
    name: pet.petname,
    species: pet.species || "dog",
    breed: pet.breed || "알 수 없음",
    age,
    gender: pet.gender || "미상",
    weight: pet.weight_kg ?? "?",
  };
};

const WINDOW_DAYS: Record<string, { start: number; count: number }> = {
  immediate: { start: 0, count: 1 },
  emergency_today: { start: 0, count: 1 },
  urgent_24h: { start: 1, count: 2 },
  semi_urgent_48h: { start: 2, count: 3 },
  routine_72h: { start: 3, count: 3 },
};

const getDatesForWindow = (slotWindow: string): string[] => {
  const { start, count } = WINDOW_DAYS[slotWindow] ?? { start: 1, count: 2 };
  const dates: string[] = [];
  const today = new Date();
  for (let i = start; i < start + count; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
};

const nextId = () => Date.now() + Math.random();

export const useAgentPipeline = ({
  setMessages,
  setQuickReplies,
  setIsStreaming,
}: UseAgentPipelineParams) => {
  const [phase, setPhase] = useState<PipelinePhase>("chatting");
  const [emergencyAlert, setEmergencyAlert] = useState(false);

  // Mutable refs — no re-render needed
  const triageResultRef = useRef<Record<string, unknown> | null>(null);
  const scheduleResultRef = useRef<Record<string, unknown> | null>(null);
  const currentPetRef = useRef<Pet | null>(null);
  const slotMapRef = useRef<Record<string, { date: string; time: string }>>({});
  const followupSummaryRef = useRef<string | null>(null);

  const appendBot = (content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: "assistant" as const, content },
    ]);
  };

  const startSchedulePhase = async (
    pet: Pet,
    collectedInfo: Record<string, unknown>,
  ) => {
    triageResultRef.current = collectedInfo;
    currentPetRef.current = pet;
    setPhase("scheduling");
    setIsStreaming(true);
    appendBot("잠시만요, 예약 가능한 시간을 확인하고 있어요 ⏳");

    try {
      const petPayload = toPetPayload(pet);
      const { task_id } = await runAgentTask("schedule", {
        pet: petPayload,
        triage_result: collectedInfo,
      });

      const raw = await streamAgentResult(task_id);
      const schedRes = raw as {
        slot_window: string;
        estimated_duration_min: number;
        pre_visit_instructions: string[];
        priority_reason: string;
      } | null;

      if (!schedRes?.slot_window) {
        appendBot(
          "예약 가능한 시간을 불러오지 못했어요. 예약 페이지에서 직접 예약해주세요.",
        );
        setPhase("chatting");
        return;
      }

      scheduleResultRef.current = raw;

      // Collect available slots
      const dates = getDatesForWindow(schedRes.slot_window);
      const collected: { date: string; start_time: string }[] = [];

      for (const date of dates) {
        if (collected.length >= 4) break;
        try {
          const resp = await getAvailableScheduleSlots({
            date,
            duration_min: schedRes.estimated_duration_min,
          });
          if (resp.code === 200) {
            for (const slot of (resp.result ?? []).slice(0, 2)) {
              collected.push({ date, start_time: slot.start_time });
              if (collected.length >= 4) break;
            }
          }
        } catch {
          // ignore per-date errors
        }
      }

      const newSlotMap: Record<string, { date: string; time: string }> = {};
      const labels: string[] = [];

      for (const s of collected) {
        const time = s.start_time.slice(0, 5);
        const [, m, d] = s.date.split("-");
        const label = `${m}월 ${d}일 ${time}`;
        newSlotMap[label] = { date: s.date, time };
        labels.push(label);
      }

      slotMapRef.current = newSlotMap;

      let msg = "";
      if (schedRes.pre_visit_instructions?.length) {
        msg +=
          "내원 전 준비사항:\n" +
          schedRes.pre_visit_instructions.map((i) => `• ${i}`).join("\n") +
          "\n\n";
      }
      msg +=
        labels.length > 0
          ? "아래 시간 중 편한 때를 선택해주세요:"
          : "현재 예약 가능한 슬롯이 없어요. 예약 페이지에서 직접 예약해주세요.";

      appendBot(msg);
      if (labels.length > 0) {
        setQuickReplies(labels);
        setPhase("slot-selection");
      } else {
        setPhase("chatting");
      }
    } catch {
      appendBot(
        "예약 시간 확인 중 오류가 발생했어요. 예약 페이지에서 직접 예약해주세요.",
      );
      setPhase("chatting");
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSlotSelect = async (label: string, petId: number) => {
    const slot = slotMapRef.current[label];
    if (!slot) {
      // not a slot label — fall through to normal chat
      return false;
    }

    setPhase("booking");
    setIsStreaming(true);
    appendBot("예약을 처리하고 있어요...");

    try {
      const triage = triageResultRef.current;
      const memo =
        (triage?.symptom_summary as string) ||
        (triage?.chief_complaint as string) ||
        "AI 문진 예약";

      const resp = await reserveCheckupSchedule({
        pet_id: petId,
        date: slot.date,
        time: slot.time,
        memo,
      });

      if (resp.code === 200 || resp.code === 201) {
        const [, m, d] = slot.date.split("-");
        appendBot(
          `예약이 완료되었어요! 📅 ${m}월 ${d}일 ${slot.time}에 내원해주세요.`,
        );

        const needFollowup = triage?.need_followup as boolean | undefined;
        if (needFollowup) {
          appendBot(
            "예약일까지 증상 변화를 모니터링할게요. 증상이 변하면 여기에 알려주세요.",
          );
          setPhase("followup");
        } else {
          setPhase("confirmed");
        }

        // Background: chart + validation + judge
        runBackgroundAgents();
      } else {
        appendBot(
          "예약 중 오류가 발생했어요. 예약 페이지에서 직접 예약해주세요.",
        );
        setPhase("slot-selection");
        setQuickReplies(Object.keys(slotMapRef.current));
      }
    } catch {
      appendBot("예약 중 오류가 발생했어요. 예약 페이지에서 직접 예약해주세요.");
      setPhase("slot-selection");
      setQuickReplies(Object.keys(slotMapRef.current));
    } finally {
      setIsStreaming(false);
    }
    return true;
  };

  const runBackgroundAgents = () => {
    const pet = currentPetRef.current;
    const triage = triageResultRef.current;
    const schedule = scheduleResultRef.current;
    if (!pet || !triage) return;

    const petPayload = toPetPayload(pet);

    // Chart + Validation in parallel
    void Promise.all([
      runAgentTask("chart", {
        pet: petPayload,
        triage_result: triage,
      }).then(({ task_id }) => streamAgentResult(task_id)),
      runAgentTask("validation", {
        pet: petPayload,
        triage_result: triage,
        schedule_result: schedule,
      }).then(({ task_id }) => streamAgentResult(task_id)),
    ]);

    // Judge — fire-and-forget
    void runAgentTask("judge", {
      pet: petPayload,
      triage_result: triage,
      messages: [],
    }).then(({ task_id }) => streamAgentResult(task_id));
  };

  const handleFollowupMessage = async (content: string) => {
    const pet = currentPetRef.current;
    const triage = triageResultRef.current;
    if (!pet || !triage || phase !== "followup") return;

    setIsStreaming(true);

    try {
      const petPayload = toPetPayload(pet);
      const { task_id } = await runAgentTask("followup", {
        pet: petPayload,
        triage_info: triage,
        messages: [{ role: "user", content }],
        accumulated_summary: followupSummaryRef.current,
      });

      const raw = await streamAgentResult(task_id);
      const result = raw as {
        message?: string;
        emergency_alert?: boolean;
        medical_summary?: string;
      } | null;

      if (result?.message) {
        appendBot(result.message);
      } else {
        appendBot("응답을 불러오지 못했어요. 다시 시도해주세요.");
      }

      if (result?.emergency_alert) {
        setEmergencyAlert(true);
      }

      if (result?.medical_summary) {
        followupSummaryRef.current = followupSummaryRef.current
          ? `${followupSummaryRef.current}\n${result.medical_summary}`
          : result.medical_summary;
      }
    } catch {
      appendBot("응답을 불러오지 못했어요. 다시 시도해주세요.");
    } finally {
      setIsStreaming(false);
    }
  };

  const isSlotLabel = (label: string) => label in slotMapRef.current;

  const getSlotLabels = () => Object.keys(slotMapRef.current);

  const resetPipeline = () => {
    setPhase("chatting");
    setEmergencyAlert(false);
    triageResultRef.current = null;
    scheduleResultRef.current = null;
    currentPetRef.current = null;
    slotMapRef.current = {};
    followupSummaryRef.current = null;
  };

  return {
    phase,
    emergencyAlert,
    isSlotLabel,
    getSlotLabels,
    startSchedulePhase,
    handleSlotSelect,
    handleFollowupMessage,
    resetPipeline,
  };
};
