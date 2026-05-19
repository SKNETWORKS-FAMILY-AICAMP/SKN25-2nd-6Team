import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import {
  createChatSession,
  deleteChatSession,
  getChatSessions,
  type ChatSessionHistory,
  type ChatSessionResult,
} from "../api/chat-api";
import type { Pet } from "../api/pets-api";
import type { ChatMessage } from "./use-chat-conversation";

interface UseChatSessionsParams {
  selectedPet?: Pet;
  resetConversationState: () => void;
  setSession: Dispatch<SetStateAction<ChatSessionResult | null>>;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setErrorMessage: (message: string) => void;
  getErrorMessage: (error: unknown, fallbackMessage: string) => string;
  getProfileImage: (pet: Pet) => string;
}

export const useChatSessions = ({
  selectedPet,
  resetConversationState,
  setSession,
  setMessages,
  setErrorMessage,
  getErrorMessage,
  getProfileImage,
}: UseChatSessionsParams) => {
  const [chatHistories, setChatHistories] = useState<ChatSessionHistory[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(
    null,
  );
  const [isLoadingHistories, setIsLoadingHistories] = useState(false);
  const [creatingPetId, setCreatingPetId] = useState<number | null>(null);

  const selectedHistory = useMemo(
    () =>
      chatHistories.find((history) => history.session_id === selectedHistoryId),
    [chatHistories, selectedHistoryId],
  );

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
  }, [getErrorMessage, selectedPet, setErrorMessage]);

  const resetSessionStateForPetChange = () => {
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

  return {
    chatHistories,
    selectedHistoryId,
    selectedHistory,
    isLoadingHistories,
    creatingPetId,
    resetSessionStateForPetChange,
    handleCreateSession,
    handleSelectHistory,
    handleDeleteHistory,
  };
};
