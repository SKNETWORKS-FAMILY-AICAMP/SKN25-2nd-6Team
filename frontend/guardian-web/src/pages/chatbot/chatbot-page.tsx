import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { isAxiosError } from "axios";
import { useSearchParams } from "react-router-dom";
import ChatDatePicker from "../../components/chatbot/chat-date-picker";

const SYMPTOM_PILLS = [
  "구토",
  "설사",
  "피부",
  "기침",
  "식욕저하",
  "눈물",
  "절뚝거림",
] as const;

const INITIAL_BOT_MESSAGE = "어떤 증상 때문에 예약을 원하시나요?";

// chatPhase: UI 레이어에서 사용하는 상태 머신
// IDLE / SYMPTOM_COLLECTING → pipeline.phase === "chatting"
// TRIAGE_RUNNING           → pipeline.phase === "scheduling"
// SLOT_RECOMMENDING        → pipeline.phase === "slot-selection"
// BOOKING_CONFIRMED        → pipeline.phase === "confirmed"
// FOLLOWUP_ACTIVE          → pipeline.phase === "followup"
type ChatPhase =
  | "IDLE"
  | "SYMPTOM_COLLECTING"
  | "TRIAGE_RUNNING"
  | "SLOT_RECOMMENDING"
  | "BOOKING_CONFIRMED"
  | "FOLLOWUP_ACTIVE";

import { type ChatSessionHistory } from "../../api/chat-api";
import { getPets, type Pet } from "../../api/pets-api";
import ChatInputBox from "../../components/chatbot/chat-input-box";
import ChatMessageList from "../../components/chatbot/chat-message-list";
import ChatSessionList from "../../components/chatbot/chat-session-list";
import PetSelector from "../../components/chatbot/pet-selector";
import GuardianNavbar from "../../components/guardian-navbar";
import { useChatConversation } from "../../hooks/use-chat-conversation";
import { useChatSessions } from "../../hooks/use-chat-sessions";
import { useChatUpload } from "../../hooks/use-chat-upload";
import { useAgentPipeline } from "../../hooks/use-agent-pipeline";

const defaultProfileImages = [
  "/assets/profile1.png",
  "/assets/profile2.png",
  "/assets/profile3.png",
  "/assets/profile4.png",
  "/assets/profile5.png",
  "/assets/profile6.png",
];

const getProfileImage = (pet: Pet) =>
  pet.profile_image ||
  defaultProfileImages[Math.abs(pet.pet_id) % defaultProfileImages.length];

const getErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (isAxiosError<{ message?: string } | string>(error)) {
    const responseData = error.response?.data;

    if (typeof responseData === "string") {
      try {
        const parsedData = JSON.parse(responseData) as { message?: string };
        return parsedData.message || fallbackMessage;
      } catch {
        return fallbackMessage;
      }
    }

    return responseData?.message || fallbackMessage;
  }

  return fallbackMessage;
};

const getHistoryTitle = (history: ChatSessionHistory) =>
  history.keywords.length > 0 ? history.keywords.join(", ") : "상담 기록";

const formatDateToYyyyMmDd = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const ChatbotIcon = () => (
  <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 ring-8 ring-blue-50/60">
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
      <div className="grid h-6 w-7 grid-cols-2 gap-x-2 gap-y-1 rounded-lg border-2 border-white/90 px-1 py-1">
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
        <span className="col-span-2 mx-auto h-1 w-4 rounded-full bg-white/90" />
      </div>
    </div>
    <span className="absolute -top-1 h-3 w-3 rounded-full bg-blue-500" />
  </div>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
    <path
      d="M9 4h6M4 7h16M18 7l-.7 11.2A2 2 0 0 1 15.3 20H8.7a2 2 0 0 1-2-1.8L6 7M10 11v5M14 11v5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChatbotPage = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [searchParams] = useSearchParams();
  const selectedPetIdFromQuery = Number(searchParams.get("petId"));
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(
    Number.isFinite(selectedPetIdFromQuery) ? selectedPetIdFromQuery : null,
  );
  const [isLoadingPets, setIsLoadingPets] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const {
    pendingAttachment,
    setPendingAttachment,
    clearPendingAttachment,
    handleSelectAttachment,
    isUploadingAttachment,
  } = useChatUpload({
    setErrorMessage,
    getErrorMessage,
  });

  // onTriageComplete를 ref로 관리 — pipeline 초기화 전 순환 참조 방지
  const onTriageCompleteRef = useRef<
    | ((
        sessionId: number,
        keywords: string[],
        collectedInfo: Record<string, unknown>,
        emrid?: number,
      ) => void)
    | undefined
  >(undefined);

  const {
    session,
    setSession,
    messages,
    setMessages,
    messageInput,
    setMessageInput,
    quickReplies,
    setQuickReplies,
    isStreaming,
    setIsStreaming,
    resetConversationState,
    handleSendMessage,
  } = useChatConversation({
    pendingAttachment,
    setPendingAttachment,
    clearPendingAttachment,
    isUploadingAttachment,
    setErrorMessage,
    getErrorMessage,
    onTriageComplete: (sessionId, keywords, collectedInfo, emrid) =>
      onTriageCompleteRef.current?.(sessionId, keywords, collectedInfo, emrid),
  });

  const pipeline = useAgentPipeline({
    setMessages,
    setQuickReplies,
    setIsStreaming,
  });

  const selectedPet = useMemo(
    () => pets.find((pet) => pet.pet_id === selectedPetId),
    [pets, selectedPetId],
  );

  const {
    chatHistories,
    selectedHistoryId,
    selectedHistory,
    isLoadingHistories,
    isLoadingHistoryMessages,
    creatingPetId,
    resetSessionStateForPetChange,
    handleCreateSession,
    handleSelectHistory,
    handleDeleteHistory,
    refreshChatHistories,
  } = useChatSessions({
    selectedPet,
    resetConversationState,
    setSession,
    setMessages,
    setErrorMessage,
    getErrorMessage,
    getProfileImage,
  });

  // pipeline이 정의된 후 ref를 최신 값으로 동기화
  onTriageCompleteRef.current = (_sessionId, _keywords, collectedInfo, emrid) => {
    if (selectedPet) {
      refreshChatHistories(selectedPet.pet_id);
      void pipeline.startSchedulePhase(selectedPet, collectedInfo, emrid);
    }
  };

  // 세션 초기화 시 pipeline도 초기화
  useEffect(() => {
    if (!session) {
      pipeline.resetPipeline();
    }
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  // 새 세션 시작 시 초기 증상 질문 + symptom pills 자동 출력
  useEffect(() => {
    if (session && messages.length === 0) {
      setMessages([{ id: Date.now(), role: "assistant", content: INITIAL_BOT_MESSAGE }]);
      setQuickReplies([...SYMPTOM_PILLS]);
    }
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  // pipeline.phase → chatPhase 매핑 (UI 상태 제어용)
  const chatPhase = useMemo((): ChatPhase => {
    switch (pipeline.phase) {
      case "scheduling": return "TRIAGE_RUNNING";
      case "slot-selection": return "SLOT_RECOMMENDING";
      case "booking": return "SLOT_RECOMMENDING";
      case "confirmed": return "BOOKING_CONFIRMED";
      case "followup": return "FOLLOWUP_ACTIVE";
      default:
        return messages.length === 0 ? "IDLE" : "SYMPTOM_COLLECTING";
    }
  }, [pipeline.phase, messages.length]);

  const todayChatTitle = useMemo(() => formatDateToYyyyMmDd(new Date()), []);

  useEffect(() => {
    let isMounted = true;

    const loadPets = async () => {
      try {
        setIsLoadingPets(true);
        setErrorMessage("");

        const response = await getPets();
        if (!isMounted) return;

        if (response.code !== 200) {
          setErrorMessage(
            response.message || "반려동물 목록을 불러오지 못했습니다.",
          );
          setPets([]);
          return;
        }

        setPets(
          [...response.result].sort((a, b) =>
            a.petname.localeCompare(b.petname, "ko"),
          ),
        );
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(
          getErrorMessage(error, "반려동물 목록을 불러오지 못했습니다."),
        );
      } finally {
        if (isMounted) setIsLoadingPets(false);
      }
    };

    loadPets();
    return () => { isMounted = false; };
  }, []);

  const handleSelectPet = (petId: number) => {
    if (petId === selectedPetId) return;
    setSelectedPetId(petId);
    resetSessionStateForPetChange();
  };

  // 통합 메시지 전송 핸들러 — phase에 따라 분기
  const handleSendCombined = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isStreaming || isUploadingAttachment) return;

    if (pipeline.phase === "slot-selection") {
      // 슬롯 버튼 클릭 또는 텍스트 입력
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "user" as const, content: trimmed },
      ]);
      setQuickReplies([]);
      setMessageInput("");
      if (pipeline.isSlotLabel(trimmed) && selectedPet) {
        await pipeline.handleSlotSelect(trimmed, selectedPet.pet_id);
      } else {
        // 슬롯이 아닌 텍스트 — 안내 메시지 표시
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: "assistant" as const,
            content: "위 시간 중 하나를 선택해주세요.",
          },
        ]);
        setQuickReplies(pipeline.getSlotLabels());
      }
      return;
    }

    if (pipeline.phase === "followup") {
      // 경과 모니터링 메시지
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "user" as const, content: trimmed },
      ]);
      setQuickReplies([]);
      setMessageInput("");
      await pipeline.handleFollowupMessage(trimmed);
      return;
    }

    if (pipeline.phase === "confirmed") return; // 상담 완료 — 입력 차단

    // 일반 트리아지 채팅
    await handleSendMessage(trimmed);
  };

  const handleSubmitCombined = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSendCombined(messageInput);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <GuardianNavbar />

      <main className="mx-auto flex h-[calc(100vh-4rem)] min-h-0 w-full max-w-6xl flex-col px-4 py-4 sm:px-6">
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl shadow-blue-100/50">

          {/* 상태 확인 안내 배너 (followup에서 escalationPromptVisible=true 시) */}
          {pipeline.escalationPromptVisible ? (
            <div className="border-b border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 sm:px-7 flex justify-between items-center flex-wrap gap-2">
              <span>🩺 병원에 증상 변화를 문의하거나 일정을 조정하는 것을 권장해 드립니다.</span>
              <div className="flex gap-2">
                {pipeline.guardianCareRecommendation.map((actionLabel, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (actionLabel.includes("전화")) {
                        window.location.href = "tel:02-0000-0001";
                      }
                    }}
                    className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-black transition"
                  >
                    {actionLabel}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-600 sm:px-7">
              {errorMessage}
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 lg:grid-cols-[140px_220px_1fr]">
            <PetSelector
              pets={pets}
              selectedPetId={selectedPetId}
              isLoadingPets={isLoadingPets}
              onSelectPet={handleSelectPet}
              getProfileImage={getProfileImage}
            />

            <ChatSessionList
              selectedPet={selectedPet}
              chatHistories={chatHistories}
              selectedHistoryId={selectedHistoryId}
              isLoadingHistories={isLoadingHistories}
              creatingPetId={creatingPetId}
              onCreateSession={handleCreateSession}
              onSelectHistory={handleSelectHistory}
              onDeleteHistory={handleDeleteHistory}
              getHistoryTitle={getHistoryTitle}
            />

            <section className="flex min-h-0 flex-col overflow-hidden bg-white">
              {session ? (
                <>
                  <div className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-100 px-5 sm:px-7">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-base font-black text-slate-950">
                        {todayChatTitle} 새 상담
                      </h2>
                      {chatPhase === "FOLLOWUP_ACTIVE" ? (
                        <p className="text-xs font-semibold text-blue-500">경과 모니터링 중</p>
                      ) : chatPhase === "BOOKING_CONFIRMED" ? (
                        <p className="text-xs font-semibold text-green-600">예약 완료</p>
                      ) : chatPhase === "TRIAGE_RUNNING" ? (
                        <p className="text-xs font-semibold text-amber-500">증상 분석 중...</p>
                      ) : chatPhase === "SLOT_RECOMMENDING" ? (
                        <p className="text-xs font-semibold text-blue-600">예약 슬롯 선택</p>
                      ) : null}
                    </div>
                    {/* 상태 배지 */}
                    {chatPhase !== "IDLE" && chatPhase !== "SYMPTOM_COLLECTING" && (
                      <span className={[
                        "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase",
                        chatPhase === "BOOKING_CONFIRMED" ? "bg-green-100 text-green-700" :
                        chatPhase === "FOLLOWUP_ACTIVE" ? "bg-blue-100 text-blue-700" :
                        "bg-amber-100 text-amber-700",
                      ].join(" ")}>
                        {chatPhase === "TRIAGE_RUNNING" ? "분석중" :
                         chatPhase === "SLOT_RECOMMENDING" ? "슬롯선택" :
                         chatPhase === "BOOKING_CONFIRMED" ? "예약완료" :
                         chatPhase === "FOLLOWUP_ACTIVE" ? "모니터링" : ""}
                      </span>
                    )}
                  </div>

                  <ChatMessageList
                    messages={messages}
                    quickReplies={quickReplies}
                    isStreaming={isStreaming}
                    onSendMessage={(content) => {
                      void handleSendCombined(content);
                    }}
                  />

                  {/* 직접 날짜 선택 피커 */}
                  {pipeline.showDatePicker && (
                    <ChatDatePicker
                      onSelectSlot={(date, time, doctorid, label) => {
                        void pipeline.handleManualSlotSelect(date, time, doctorid, label);
                      }}
                      onCancel={() => pipeline.setShowDatePicker(false)}
                    />
                  )}

                  {/* 상태별 입력 영역 */}
                  {chatPhase === "BOOKING_CONFIRMED" ? (
                    <div className="border-t border-slate-100 px-5 py-4 text-center text-sm font-semibold text-slate-400">
                      상담이 완료되었습니다. 새 상담을 시작하려면 왼쪽에서 선택해주세요.
                    </div>
                  ) : chatPhase === "SLOT_RECOMMENDING" ? (
                    <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-slate-400">
                        위 시간 카드를 선택하거나
                      </span>
                      <button
                        type="button"
                        onClick={() => pipeline.setShowDatePicker((v) => !v)}
                        className="shrink-0 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-black text-blue-600 transition hover:bg-blue-50"
                      >
                        직접 날짜 선택하기 📅
                      </button>
                    </div>
                  ) : (
                    <ChatInputBox
                      fileInputRef={fileInputRef}
                      pendingAttachment={pendingAttachment}
                      messageInput={messageInput}
                      isStreaming={isStreaming || chatPhase === "TRIAGE_RUNNING"}
                      isUploadingAttachment={isUploadingAttachment}
                      onClearPendingAttachment={clearPendingAttachment}
                      onSelectAttachment={handleSelectAttachment}
                      onSubmitMessage={handleSubmitCombined}
                      onChangeMessageInput={setMessageInput}
                    />
                  )}
                </>
              ) : selectedHistory && selectedPet ? (
                <>
                  <div className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-100 px-5 sm:px-7">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-base font-black text-slate-950">
                        {getHistoryTitle(selectedHistory)}
                      </h2>
                      <p className="text-xs font-bold text-slate-500">
                        {selectedPet.petname} · {selectedHistory.created_at}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteHistory(selectedHistory)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                      aria-label="상담 기록 삭제"
                    >
                      <TrashIcon />
                    </button>
                  </div>

                  {isLoadingHistoryMessages ? (
                    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 sm:p-7">
                      <div className="flex-1" />
                      <div className="max-w-[82%] rounded-3xl rounded-bl-lg bg-slate-100 px-5 py-4 text-sm font-semibold leading-6 text-slate-700">
                        이전 상담 내용을 불러오는 중입니다.
                      </div>
                    </div>
                  ) : (
                    <ChatMessageList
                      messages={messages}
                      quickReplies={[]}
                      isStreaming={false}
                      onSendMessage={() => {}}
                    />
                  )}
                </>
              ) : (
                <>
                  <div className="flex h-14 shrink-0 items-center border-b border-slate-100 px-5 sm:px-7">
                    <h2 className="truncate text-base font-black text-slate-950">
                      챗봇 상담
                    </h2>
                  </div>
                  <div className="flex flex-1 items-center justify-center px-6 py-16 text-center">
                    <div>
                      <ChatbotIcon />
                      <h2 className="mt-7 text-xl font-black text-slate-950">
                        상담을 선택해주세요
                      </h2>
                      <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">
                        반려동물을 선택한 뒤 상담 기록을 열거나
                        <br className="hidden sm:block" />새 상담을 시작할 수
                        있어요.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ChatbotPage;
