import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { isAxiosError } from "axios";
import { Link, useSearchParams } from "react-router-dom";

import {
  createChatSession,
  deleteChatSession,
  getChatSessions,
  getChatUploadPresignedUrl,
  sendChatMessage,
  uploadChatAttachment,
  type ChatSessionHistory,
  type ChatSessionResult,
  type ChatStreamEvent,
} from "../../api/chat-api";
import { getPets, type Pet } from "../../api/pets-api";
import GuardianNavbar from "../../components/guardian-navbar";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  attachmentUrl?: string;
  attachmentType?: string;
}

interface PendingAttachment {
  fileName: string;
  contentType: string;
  cloudfrontUrl: string;
  previewUrl: string;
}

const defaultProfileImages = [
  "/assets/profile1.png",
  "/assets/profile2.png",
  "/assets/profile3.png",
  "/assets/profile4.png",
  "/assets/profile5.png",
  "/assets/profile6.png",
];

const allowedAttachmentTypes = ["image/jpeg", "image/png", "video/mp4"];

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

const MicrophoneIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
    <path
      d="M12 14.5a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5.5a3 3 0 0 0 3 3Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M18.5 11.5a6.5 6.5 0 0 1-13 0M12 18v3M9 21h6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
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

const SendIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
    <path
      d="M5 12 19 5l-4 14-3-6-7-1Z"
      fill="currentColor"
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
  const [chatHistories, setChatHistories] = useState<ChatSessionHistory[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(
    null,
  );
  const [session, setSession] = useState<ChatSessionResult | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [pendingAttachment, setPendingAttachment] =
    useState<PendingAttachment | null>(null);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isLoadingPets, setIsLoadingPets] = useState(true);
  const [isLoadingHistories, setIsLoadingHistories] = useState(false);
  const [creatingPetId, setCreatingPetId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedPet = useMemo(
    () => pets.find((pet) => pet.pet_id === selectedPetId),
    [pets, selectedPetId],
  );
  const selectedHistory = useMemo(
    () =>
      chatHistories.find((history) => history.session_id === selectedHistoryId),
    [chatHistories, selectedHistoryId],
  );
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

  useEffect(() => {
    if (!selectedPet) {
      setChatHistories([]);
      return;
    }

    let isMounted = true;

    const loadChatHistories = async () => {
      try {
        setIsLoadingHistories(true);
        setErrorMessage("");

        const response = await getChatSessions(selectedPet.pet_id);
        if (!isMounted) {
          return;
        }

        if (response.code !== 200) {
          setErrorMessage(response.message || "상담 기록을 불러오지 못했습니다.");
          setChatHistories([]);
          return;
        }

        setChatHistories(response.result);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          getErrorMessage(error, "상담 기록을 불러오지 못했습니다."),
        );
        setChatHistories([]);
      } finally {
        if (isMounted) {
          setIsLoadingHistories(false);
        }
      }
    };

    loadChatHistories();

    return () => {
      isMounted = false;
    };
  }, [selectedPet]);

  const clearPendingAttachment = () => {
    if (pendingAttachment?.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(pendingAttachment.previewUrl);
    }

    setPendingAttachment(null);
  };

  const resetConversationState = () => {
    setSession(null);
    setMessages([]);
    setQuickReplies([]);
    setMessageInput("");
    clearPendingAttachment();
    setIsStreaming(false);
  };

  const handleSelectPet = (petId: number) => {
    setSelectedPetId(petId);
    setSelectedHistoryId(null);
    setChatHistories([]);
    resetConversationState();
    setErrorMessage("");
  };

  const handleCreateSession = async () => {
    if (!selectedPet || creatingPetId !== null) {
      return;
    }

    try {
      setCreatingPetId(selectedPet.pet_id);
      setSelectedHistoryId(null);
      resetConversationState();
      setErrorMessage("");

      const response = await createChatSession({ pet_id: selectedPet.pet_id });
      if (response.code !== 201) {
        setErrorMessage(response.message || "상담 세션을 시작하지 못했습니다.");
        return;
      }

      const petName = response.result.pet_name || selectedPet.petname;
      setSession({
        ...response.result,
        pet_name: petName,
        profile_image:
          response.result.profile_image || getProfileImage(selectedPet),
      });
      setMessages([
        {
          id: Date.now(),
          role: "assistant",
          content: `안녕하세요. ${petName}의 증상과 걱정되는 점을 알려주시면 상담을 이어갈 수 있습니다.`,
        },
      ]);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "상담 세션을 시작하지 못했습니다."),
      );
    } finally {
      setCreatingPetId(null);
    }
  };

  const handleSelectHistory = (historyId: number) => {
    setSelectedHistoryId(historyId);
    resetConversationState();
  };

  const handleDeleteHistory = async (history: ChatSessionHistory) => {
    const isConfirmed = window.confirm("상담 기록을 삭제하시겠습니까?");
    if (!isConfirmed) {
      return;
    }

    try {
      setErrorMessage("");

      const response = await deleteChatSession(history.session_id);
      if (response.code !== 200) {
        setErrorMessage(response.message || "상담 기록을 삭제하지 못했습니다.");
        return;
      }

      setChatHistories((currentHistories) =>
        currentHistories.filter(
          (currentHistory) =>
            currentHistory.session_id !== history.session_id,
        ),
      );

      if (selectedHistoryId === history.session_id) {
        setSelectedHistoryId(null);
        resetConversationState();
      }
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "상담 기록을 삭제하지 못했습니다."),
      );
    }
  };

  const applyStreamEvent = (
    event: ChatStreamEvent,
    assistantMessageId: number,
  ) => {
    if (event.type === "message") {
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                content: `${message.content}${event.content}`,
              }
            : message,
        ),
      );
      return;
    }

    if (event.type === "quick_replies") {
      setQuickReplies(event.options);
      return;
    }

    if (event.type === "done") {
      setIsStreaming(false);
      return;
    }

    if (event.type === "error") {
      setErrorMessage(event.message || "응답을 불러오지 못했습니다.");
      setIsStreaming(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    const trimmedContent = content.trim();
    if (
      !session ||
      (!trimmedContent && !pendingAttachment) ||
      isStreaming ||
      isUploadingAttachment
    ) {
      return;
    }

    const userMessageId = Date.now();
    const assistantMessageId = userMessageId + 1;
    const attachmentToSend = pendingAttachment;

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: userMessageId,
        role: "user",
        content: trimmedContent || "첨부파일을 보냈습니다.",
        attachmentUrl: attachmentToSend?.previewUrl,
        attachmentType: attachmentToSend?.contentType,
      },
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
      },
    ]);
    setMessageInput("");
    setPendingAttachment(null);
    setQuickReplies([]);
    setIsStreaming(true);
    setErrorMessage("");

    try {
      await sendChatMessage(
        session.session_id,
        {
          content: trimmedContent,
          image_url: attachmentToSend?.cloudfrontUrl,
        },
        (event) => applyStreamEvent(event, assistantMessageId),
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "메시지를 전송하지 못했습니다."));
      setIsStreaming(false);
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== assistantMessageId),
      );
    }
  };

  const handleSelectAttachment = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!allowedAttachmentTypes.includes(file.type)) {
      setErrorMessage("이미지(JPG, PNG) 또는 영상(MP4) 파일만 업로드 가능합니다.");
      return;
    }

    try {
      setIsUploadingAttachment(true);
      setErrorMessage("");

      const response = await getChatUploadPresignedUrl(file.name, file.type);
      if (
        response.code !== 200 ||
        !response.result?.presigned_url ||
        !response.result.cloudfront_url
      ) {
        setErrorMessage(
          response.message || "첨부파일 업로드 URL을 발급하지 못했습니다.",
        );
        return;
      }

      await uploadChatAttachment(response.result.presigned_url, file);

      if (pendingAttachment?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(pendingAttachment.previewUrl);
      }

      setPendingAttachment({
        fileName: file.name,
        contentType: file.type,
        cloudfrontUrl: response.result.cloudfront_url,
        previewUrl: URL.createObjectURL(file),
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "첨부파일을 업로드하지 못했습니다."));
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleSubmitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSendMessage(messageInput);
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
            <aside className="flex min-h-0 flex-col border-b border-slate-100 bg-slate-50/70 lg:border-b-0 lg:border-r">
              <div className="flex h-14 shrink-0 items-center justify-center border-b border-slate-100 px-3">
                <h2 className="text-center text-sm font-black text-slate-900">
                반려동물
              </h2>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-3 pt-4">
                {isLoadingPets ? (
                <div className="mt-8 flex justify-center">
                  <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
                </div>
              ) : pets.length === 0 ? (
                <div className="mt-6 rounded-2xl bg-white p-3 text-center ring-1 ring-slate-100">
                  <p className="text-xs font-bold leading-5 text-slate-600">
                    등록된 반려동물이 없습니다.
                  </p>
                  <Link
                    to="/pets/register"
                    className="mt-3 inline-flex h-9 items-center justify-center rounded-xl bg-blue-600 px-3 text-xs font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700"
                  >
                    등록
                  </Link>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {pets.map((pet) => {
                    const isSelected = pet.pet_id === selectedPetId;

                    return (
                      <button
                        key={pet.pet_id}
                        type="button"
                        onClick={() => handleSelectPet(pet.pet_id)}
                        className={[
                          "flex w-full items-center gap-2 rounded-2xl border p-2 text-left transition",
                          isSelected
                            ? "border-blue-200 bg-blue-50 shadow-sm"
                            : "border-transparent bg-white hover:border-blue-100 hover:bg-blue-50/60",
                        ].join(" ")}
                      >
                        <img
                          src={getProfileImage(pet)}
                          alt={`${pet.petname} 프로필`}
                          className="h-11 w-11 rounded-full object-cover ring-2 ring-white"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-black text-slate-900">
                          {pet.petname}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              </div>
            </aside>

            <aside className="flex min-h-0 flex-col border-b border-slate-100 bg-white lg:border-b-0 lg:border-r">
              <div className="flex h-14 shrink-0 items-center justify-center border-b border-slate-100 px-4">
                <h2 className="text-center text-sm font-black text-slate-900">
                  상담 기록
                </h2>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4 pt-4">
                {!selectedPet ? (
                <div className="flex min-h-[420px] items-center justify-center px-2 text-center">
                  <div>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-6 w-6"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M8 10h8M8 14h5M6.5 19.5 4 21V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H9l-2.5 2.5Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <p className="mt-4 text-sm font-black text-slate-800">
                      상담 기록을 확인해보세요
                    </p>
                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                      왼쪽에서 반려동물을 선택하면
                      <br />
                      지난 상담을 볼 수 있어요.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCreateSession}
                    disabled={creatingPetId !== null}
                    className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {creatingPetId ? "세션 생성 중" : "새 상담 시작"}
                  </button>

                  {isLoadingHistories ? (
                    <div className="mt-8 flex justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
                    </div>
                  ) : chatHistories.length === 0 ? (
                    <p className="mt-6 text-center text-xs font-semibold leading-5 text-slate-500">
                      아직 상담 기록이 없습니다.
                    </p>
                  ) : (
                    <div className="mt-4 divide-y divide-slate-100 border-y border-slate-100">
                      {chatHistories.map((history) => {
                        const isSelected =
                          history.session_id === selectedHistoryId;

                        return (
                          <div
                            key={history.session_id}
                            className={[
                              "relative border-l-2 transition",
                              isSelected
                                ? "border-blue-300 bg-blue-50"
                                : "border-transparent bg-white hover:bg-blue-50/60",
                            ].join(" ")}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                handleSelectHistory(history.session_id)
                              }
                              className="block w-full px-1 py-3 pr-9 text-left"
                            >
                              <span className="block truncate text-sm font-black text-slate-900">
                                {getHistoryTitle(history)}
                              </span>
                              <span className="mt-2 block text-[10px] font-bold text-slate-400">
                                {history.created_at}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteHistory(history)}
                              className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-sm font-black text-slate-400 transition hover:bg-white hover:text-rose-500"
                              aria-label="상담 기록 삭제"
                            >
                              x
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
              </div>
            </aside>

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

                  <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 sm:p-7">
                    <div className="flex-1" />
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={[
                          "max-w-[82%] rounded-3xl px-5 py-4 text-sm font-semibold leading-6",
                          message.role === "user"
                            ? "self-end rounded-br-lg bg-blue-600 text-white"
                            : "rounded-bl-lg bg-slate-100 text-slate-700",
                        ].join(" ")}
                      >
                        {message.content || "응답을 작성하고 있어요..."}
                        {message.attachmentUrl ? (
                          message.attachmentType === "video/mp4" ? (
                            <video
                              src={message.attachmentUrl}
                              className="mt-3 max-h-56 rounded-2xl"
                              controls
                            />
                          ) : (
                            <img
                              src={message.attachmentUrl}
                              alt="첨부 이미지"
                              className="mt-3 max-h-56 rounded-2xl object-cover"
                            />
                          )
                        ) : null}
                      </div>
                    ))}
                    {quickReplies.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {quickReplies.map((reply) => (
                          <button
                            key={reply}
                            type="button"
                            onClick={() => handleSendMessage(reply)}
                            disabled={isStreaming}
                            className="rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-black text-blue-600 transition hover:bg-blue-50 disabled:opacity-60"
                          >
                            {reply}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
                    {pendingAttachment ? (
                      <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-800">
                            {pendingAttachment.fileName}
                          </p>
                          <p className="mt-1 text-xs font-bold text-blue-600">
                            첨부 완료
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={clearPendingAttachment}
                          className="h-9 rounded-xl bg-white px-3 text-xs font-black text-slate-500 transition hover:text-blue-600"
                        >
                          삭제
                        </button>
                      </div>
                    ) : null}
                    <form
                      onSubmit={handleSubmitMessage}
                      className="flex h-14 items-center gap-2 rounded-2xl bg-slate-50 p-1.5 ring-1 ring-slate-100"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,video/mp4"
                        onChange={handleSelectAttachment}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAttachment || isStreaming}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-white text-lg font-black text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-60"
                        aria-label="첨부파일 추가"
                      >
                        {isUploadingAttachment ? "..." : "+"}
                      </button>
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(event) => setMessageInput(event.target.value)}
                        disabled={isStreaming || isUploadingAttachment}
                        placeholder="메시지를 입력해주세요."
                        className="h-11 min-w-0 flex-1 bg-transparent px-2 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400 disabled:text-slate-400"
                      />
                      <button
                        type="button"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-white text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        aria-label="음성 입력"
                      >
                        <MicrophoneIcon />
                      </button>
                      <button
                        type="submit"
                        disabled={
                          (!messageInput.trim() && !pendingAttachment) ||
                          isStreaming ||
                          isUploadingAttachment
                        }
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:bg-slate-300"
                        aria-label="메시지 전송"
                      >
                        <SendIcon />
                      </button>
                    </form>
                  </div>
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

                  <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 sm:p-7">
                    <div className="flex-1" />
                    <div className="max-w-[82%] rounded-3xl rounded-bl-lg bg-slate-100 px-5 py-4 text-sm font-semibold leading-6 text-slate-700">
                      이전 상담 내용을 불러오는 중입니다.
                    </div>
                  </div>
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
