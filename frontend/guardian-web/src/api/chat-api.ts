import axios from "axios";

import { apiClient } from "./api-client";

export interface CreateChatSessionPayload {
  pet_id: number;
}

export interface ChatSessionResult {
  session_id: number;
  pet_name: string;
  profile_image?: string;
}

export interface CreateChatSessionResponse {
  code: number;
  message?: string;
  result: ChatSessionResult;
}

export interface ChatSessionHistory {
  session_id: number;
  keywords: string[];
  created_at: string;
  status: string;
}

export interface ChatSessionsResponse {
  code: number;
  message?: string;
  result: ChatSessionHistory[];
}

export interface ChatSessionMessage {
  role: "user" | "assistant";
  content: string;
  image_url?: string | null;
}

export interface ChatSessionDetailResult {
  session_id: number;
  pet_id: number;
  messages: ChatSessionMessage[];
  keywords: string[];
  is_complete: boolean;
  created_at: string;
}

export interface ChatSessionDetailResponse {
  code: number;
  message?: string;
  result?: ChatSessionDetailResult;
}

export interface DeleteChatSessionResponse {
  code: number;
  message?: string;
}

export interface SendChatMessagePayload {
  content: string;
  image_url?: string;
}

export interface ChatUploadPresignedUrlResponse {
  code: number;
  message?: string;
  result?: {
    presigned_url: string;
    cloudfront_url: string;
  };
}

export type ChatStreamEvent =
  | {
      type: "message";
      content: string;
    }
  | {
      type: "quick_replies";
      options: string[];
    }
  | {
      type: "triage_complete";
      data: {
        is_triage_complete: boolean;
        symptom_keywords: string[];
        urgency_level?: string;
        urgency_level_num?: number;
        [key: string]: unknown;
      };
    }
  | {
      type: "calendar";
      [key: string]: unknown;
    }
  | {
      type: "time_slots";
      [key: string]: unknown;
    }
  | {
      type: "booking_complete";
      [key: string]: unknown;
    }
  | {
      type: "done";
    }
  | {
      type: "error";
      message?: string;
    };

interface ApiErrorResponse {
  code: number;
  message?: string;
}

export const createChatSession = async (
  payload: CreateChatSessionPayload,
): Promise<CreateChatSessionResponse> => {
  const response = await apiClient.post<CreateChatSessionResponse>(
    "/chat/sessions",
    payload,
  );
  return response.data;
};

export const getChatSessions = async (
  petId: number,
): Promise<ChatSessionsResponse> => {
  const response = await apiClient.get<ChatSessionsResponse>("/chat/sessions", {
    params: {
      pet_id: petId,
    },
  });
  return response.data;
};

export const getChatSession = async (
  sessionId: number,
): Promise<ChatSessionDetailResponse> => {
  const response = await apiClient.get<ChatSessionDetailResponse>(
    `/chat/sessions/${sessionId}`,
  );
  return response.data;
};

export const deleteChatSession = async (
  sessionId: number,
): Promise<DeleteChatSessionResponse> => {
  const response = await apiClient.delete<DeleteChatSessionResponse>(
    `/chat/sessions/${sessionId}`,
  );
  return response.data;
};

export const getChatUploadPresignedUrl = async (
  fileName: string,
  contentType: string,
): Promise<ChatUploadPresignedUrlResponse> => {
  const response = await apiClient.get<ChatUploadPresignedUrlResponse>(
    "/chat/upload/presigned-url",
    {
      params: {
        file_name: fileName,
        content_type: contentType,
      },
    },
  );
  return response.data;
};

export const uploadChatAttachment = async (
  presignedUrl: string,
  file: File,
) => {
  await axios.put(presignedUrl, file, {
    headers: {
      "Content-Type": file.type,
    },
  });
};

const readStreamingResponseText = (event?: ProgressEvent) => {
  const target = event?.target as XMLHttpRequest | null;
  return typeof target?.responseText === "string" ? target.responseText : "";
};

const parseSseDataLine = (line: string): ChatStreamEvent | null => {
  const trimmedLine = line.trim();
  if (!trimmedLine.startsWith("data:")) {
    return null;
  }

  const rawData = trimmedLine.slice("data:".length).trim();
  if (!rawData) {
    return null;
  }

  try {
    return JSON.parse(rawData) as ChatStreamEvent;
  } catch {
    return {
      type: "error",
      message: "응답 데이터를 해석하지 못했습니다.",
    };
  }
};

const parseJsonErrorResponse = (responseText: string) => {
  try {
    const parsed = JSON.parse(responseText) as ApiErrorResponse;
    return parsed.message;
  } catch {
    return undefined;
  }
};

export const sendChatMessage = async (
  sessionId: number,
  payload: SendChatMessagePayload,
  onEvent: (event: ChatStreamEvent) => void,
) => {
  let receivedLength = 0;
  let pendingLine = "";
  let emittedEventCount = 0;

  const response = await apiClient.post<string>(
    `/chat/sessions/${sessionId}/messages`,
    payload,
    {
      responseType: "text",
      headers: {
        Accept: "text/event-stream",
      },
      onDownloadProgress: (progressEvent) => {
        const responseText = readStreamingResponseText(progressEvent.event);
        const chunk = responseText.slice(receivedLength);
        receivedLength = responseText.length;
        pendingLine += chunk;

        const lines = pendingLine.split(/\r?\n/);
        pendingLine = lines.pop() || "";

        lines.forEach((line) => {
          const event = parseSseDataLine(line);
          if (!event) {
            return;
          }

          emittedEventCount += 1;
          onEvent(event);
        });
      },
    },
  );

  const finalEvent = parseSseDataLine(pendingLine);
  if (finalEvent) {
    emittedEventCount += 1;
    onEvent(finalEvent);
  }

  if (emittedEventCount === 0 && typeof response.data === "string") {
    const errorMessage = parseJsonErrorResponse(response.data);
    if (errorMessage) {
      onEvent({
        type: "error",
        message: errorMessage,
      });
    }
  }
};
