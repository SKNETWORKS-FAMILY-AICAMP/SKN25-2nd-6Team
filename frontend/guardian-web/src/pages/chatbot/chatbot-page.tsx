import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isAxiosError } from "axios";
import { useSearchParams } from "react-router-dom";

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
  const {
    session,
    setSession,
    messages,
    setMessages,
    messageInput,
    setMessageInput,
    quickReplies,
    isStreaming,
    resetConversationState,
    handleSendMessage,
    handleSubmitMessage,
  } = useChatConversation({
    pendingAttachment,
    setPendingAttachment,
    clearPendingAttachment,
    isUploadingAttachment,
    setErrorMessage,
    getErrorMessage,
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
  } = useChatSessions({
    selectedPet,
    resetConversationState,
    setSession,
    setMessages,
    setErrorMessage,
    getErrorMessage,
    getProfileImage,
  });
  const todayChatTitle = useMemo(() => formatDateToYyyyMmDd(new Date()), []);
  useEffect(() => {
    let isMounted = true;

    const loadPets = async () => {
      try {
        setIsLoadingPets(true);
        setErrorMessage("");

        const response = await getPets();
        if (!isMounted) {
          return;
        }

        if (response.code !== 200) {
          setErrorMessage(
            response.message || "반려동물 목록을 불러오지 못했습니다.",
          );
          setPets([]);
          return;
        }

        setPets(
          [...response.result].sort((firstPet, secondPet) =>
            firstPet.petname.localeCompare(secondPet.petname, "ko"),
          ),
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          getErrorMessage(error, "반려동물 목록을 불러오지 못했습니다."),
        );
      } finally {
        if (isMounted) {
          setIsLoadingPets(false);
        }
      }
    };

    loadPets();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectPet = (petId: number) => {
    setSelectedPetId(petId);
    resetSessionStateForPetChange();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <GuardianNavbar />

      <main className="mx-auto flex h-[calc(100vh-4rem)] min-h-0 w-full max-w-6xl flex-col px-4 py-4 sm:px-6">
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl shadow-blue-100/50">
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
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-black text-slate-950">
                        {todayChatTitle} 새 상담
                      </h2>
                    </div>
                  </div>

                  <ChatMessageList
                    messages={messages}
                    quickReplies={quickReplies}
                    isStreaming={isStreaming}
                    onSendMessage={handleSendMessage}
                  />

                  <ChatInputBox
                    fileInputRef={fileInputRef}
                    pendingAttachment={pendingAttachment}
                    messageInput={messageInput}
                    isStreaming={isStreaming}
                    isUploadingAttachment={isUploadingAttachment}
                    onClearPendingAttachment={clearPendingAttachment}
                    onSelectAttachment={handleSelectAttachment}
                    onSubmitMessage={handleSubmitMessage}
                    onChangeMessageInput={setMessageInput}
                  />
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
                      onSendMessage={handleSendMessage}
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
