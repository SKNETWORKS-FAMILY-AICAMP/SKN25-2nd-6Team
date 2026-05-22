import {
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";

import {
  sendChatMessage,
  type ChatSessionResult,
  type ChatStreamEvent,
} from "../api/chat-api";
import type { PendingAttachment } from "./use-chat-upload";

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  attachmentUrl?: string;
  attachmentType?: string;
}

interface UseChatConversationParams {
  pendingAttachment: PendingAttachment | null;
  setPendingAttachment: Dispatch<SetStateAction<PendingAttachment | null>>;
  clearPendingAttachment: () => void;
  isUploadingAttachment: boolean;
  setErrorMessage: (message: string) => void;
  getErrorMessage: (error: unknown, fallbackMessage: string) => string;
  onTriageComplete?: (sessionId: number, keywords: string[]) => void;
}

export const useChatConversation = ({
  pendingAttachment,
  setPendingAttachment,
  clearPendingAttachment,
  isUploadingAttachment,
  setErrorMessage,
  getErrorMessage,
  onTriageComplete,
}: UseChatConversationParams) => {
  const [session, setSession] = useState<ChatSessionResult | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const resetConversationState = () => {
    setSession(null);
    setMessages([]);
    setQuickReplies([]);
    setMessageInput("");
    clearPendingAttachment();
    setIsStreaming(false);
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

    if (event.type === "triage_complete") {
      const keywords = event.data?.symptom_keywords ?? [];
      if (session && onTriageComplete) {
        onTriageComplete(session.session_id, keywords);
      }
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

  const handleSubmitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSendMessage(messageInput);
  };

  return {
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
  };
};
