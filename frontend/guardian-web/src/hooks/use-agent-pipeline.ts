import { useRef, useState } from "react";

import { runAgentTask, streamAgentResult } from "../api/agent-api";
import { createFollowup } from "../api/followup-api";
import {
  getAvailableScheduleSlots,
  confirmSchedule,
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
  const [internalAlertFlag, setInternalAlertFlag] = useState(false);
  const [escalationPromptVisible, setEscalationPromptVisible] = useState(false);
  const [guardianCareRecommendation, setGuardianCareRecommendation] = useState<string[]>([]);

  // Mutable refs — no re-render needed
  const triageResultRef = useRef<Record<string, unknown> | null>(null);
  const scheduleResultRef = useRef<Record<string, unknown> | null>(null);
  const currentPetRef = useRef<Pet | null>(null);
  const slotMapRef = useRef<Record<string, { date: string; time: string; doctorid: number }>>({});
  const emridRef = useRef<number | null>(null);
  const lastRequestRef = useRef<number>(0);

  const appendBot = (content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: "assistant" as const, content },
    ]);
  };

  const startSchedulePhase = async (
    pet: Pet,
    collectedInfo: Record<string, unknown>,
    emrid?: number,
  ) => {
    triageResultRef.current = collectedInfo;
    currentPetRef.current = pet;
    emridRef.current = emrid ?? null;
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
      const collected: { date: string; start_time: string; doctorid?: number }[] = [];

      for (const date of dates) {
        if (collected.length >= 4) break;
        try {
          const resp = await getAvailableScheduleSlots({
            date,
            duration_min: schedRes.estimated_duration_min,
          });
          if (resp.code === 200) {
            for (const slot of (resp.result ?? []).slice(0, 2)) {
              collected.push({ date, start_time: slot.start_time, doctorid: slot.doctorid });
              if (collected.length >= 4) break;
            }
          }
        } catch {
          // ignore per-date errors
        }
      }

      const newSlotMap: Record<string, { date: string; time: string; doctorid: number }> = {};
      const labels: string[] = [];

      for (const s of collected) {
        const time = s.start_time.slice(0, 5);
        const [, m, d] = s.date.split("-");
        const label = `${m}월 ${d}일 ${time}`;
        newSlotMap[label] = { date: s.date, time, doctorid: s.doctorid || 1 };
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
      return false;
    }

    setPhase("booking");
    setIsStreaming(true);
    appendBot("예약을 처리하고 있어요...");

    const emrid = emridRef.current;
    if (!emrid) {
      appendBot("문진 예약 데이터가 존재하지 않습니다. 처음부터 상담을 진행해주세요.");
      setPhase("chatting");
      setIsStreaming(false);
      return false;
    }

    try {
      const triage = triageResultRef.current;
      const duration = (scheduleResultRef.current?.estimated_duration_min as number) || 30;

      const resp = await confirmSchedule({
        emrid: emrid,
        doctorid: slot.doctorid,
        confirmed_time: `${slot.date}T${slot.time}:00+09:00`,
        duration_min: duration,
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

  const handleFollowupMessage = async (content: string) => {
    const emrid = emridRef.current;
    if (!emrid || phase !== "followup") return;

    let messagesBackup: ChatMessage[] = [];
    setMessages((prev) => {
      messagesBackup = prev;
      return prev;
    });

    const requestId = ++lastRequestRef.current;
    setIsStreaming(true);

    try {
      const resp = await createFollowup({ emrid, message: content, images: [] });
      
      if (requestId !== lastRequestRef.current) {
        return; // Stale request, ignore
      }

      const followupRes = resp.result;
      
      if (followupRes?.guardian_message) {
        appendBot(followupRes.guardian_message);
      } else {
        appendBot("경과가 기록되었어요. 담당 수의사에게 전달됩니다.");
      }

      if (followupRes?.followup_recommended) {
        setInternalAlertFlag(true);
        setEscalationPromptVisible(true);
        
        const actions = followupRes.recommended_actions || [];
        const actionLabels = actions.map((action: string) => {
          if (action === "call_hospital") return "📞 병원 전화 연결";
          if (action === "keep_schedule") return "📅 기존 예약 유지";
          if (action === "fast_booking") return "🕒 빠른 예약 가능 시간 보기";
          return action;
        });
        
        setGuardianCareRecommendation(actionLabels);
        setQuickReplies(actionLabels);
      } else {
        setInternalAlertFlag(false);
        setEscalationPromptVisible(false);
        setGuardianCareRecommendation([]);
      }
    } catch (err) {
      if (requestId === lastRequestRef.current) {
        setMessages(messagesBackup); // Rollback to backup state
        appendBot("기록에 실패했어요. 다시 시도해주세요.");
      }
    } finally {
      if (requestId === lastRequestRef.current) {
        setIsStreaming(false);
      }
    }
  };

  const isSlotLabel = (label: string) => label in slotMapRef.current;

  const getSlotLabels = () => Object.keys(slotMapRef.current);

  const resetPipeline = () => {
    setPhase("chatting");
    triageResultRef.current = null;
    scheduleResultRef.current = null;
    currentPetRef.current = null;
    slotMapRef.current = {};
    emridRef.current = null;
  };

  return {
    phase,
    internalAlertFlag,
    escalationPromptVisible,
    guardianCareRecommendation,
    isSlotLabel,
    getSlotLabels,
    startSchedulePhase,
    handleSlotSelect,
    handleFollowupMessage,
    resetPipeline,
  };
};
