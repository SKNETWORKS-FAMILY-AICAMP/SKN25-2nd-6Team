import axios from "axios";

import { apiClient } from "./api-client";
import { useAuthStore } from "../stores/auth-store";

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

const demoGuardianLoginId = "guardian-demo";

const isDemoGuardian = () =>
  import.meta.env.DEV &&
  useAuthStore.getState().guardian?.loginid === demoGuardianLoginId;

export const createChatSession = async (
  payload: CreateChatSessionPayload,
): Promise<CreateChatSessionResponse> => {
  if (isDemoGuardian()) {
    return {
      code: 201,
      message: "데모 상담 세션이 생성되었습니다.",
      result: {
        session_id: Date.now(),
        pet_name: "반려동물",
        profile_image: "/assets/profile1.png",
      },
    };
  }

  const response = await apiClient.post<CreateChatSessionResponse>(
    "/chat/sessions",
    payload,
  );
  return response.data;
};

export const getChatSessions = async (
  petId: number,
): Promise<ChatSessionsResponse> => {
  if (isDemoGuardian()) {
    return {
      code: 200,
      result: [
        {
          session_id: petId * 10 + 1,
          keywords: ["피부 가려움"],
          created_at: "2024-05-01",
          status: "진료완료",
        },
        {
          session_id: petId * 10 + 2,
          keywords: ["식욕 저하"],
          created_at: "2024-04-20",
          status: "진료완료",
        },
      ],
    };
  }

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
  if (isDemoGuardian()) {
    return {
      code: 200,
      result: {
        session_id: sessionId,
        pet_id: Math.floor(sessionId / 10),
        messages: [
          {
            role: "user",
            content: "코코가 지금 헐떡거려요",
            image_url: null,
          },
          {
            role: "assistant",
            content: "안녕하세요! 반려동물의 증상에 대해 말씀해 주세요.",
            image_url: null,
          },
        ],
        keywords: ["헐떡거림"],
        is_complete: false,
        created_at: "2026-05-19 13:50:47",
      },
    };
  }

  const response = await apiClient.get<ChatSessionDetailResponse>(
    `/chat/sessions/${sessionId}`,
  );
  return response.data;
};

export const deleteChatSession = async (
  sessionId: number,
): Promise<DeleteChatSessionResponse> => {
  if (isDemoGuardian()) {
    return {
      code: 200,
      message: "상담 기록이 삭제되었습니다.",
    };
  }

  const response = await apiClient.delete<DeleteChatSessionResponse>(
    `/chat/sessions/${sessionId}`,
  );
  return response.data;
};

export const getChatUploadPresignedUrl = async (
  fileName: string,
  contentType: string,
): Promise<ChatUploadPresignedUrlResponse> => {
  if (isDemoGuardian()) {
    return {
      code: 200,
      result: {
        presigned_url: "demo-presigned-url",
        cloudfront_url: "demo-cloudfront-url",
      },
    };
  }

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
  if (isDemoGuardian()) {
    return;
  }

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

const sleep = (milliseconds: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });

export const sendChatMessage = async (
  sessionId: number,
  payload: SendChatMessagePayload,
  onEvent: (event: ChatStreamEvent) => void,
) => {
  if (isDemoGuardian()) {
    const demoEvents: ChatStreamEvent[] = [
      {
        type: "message",
        content: "말씀해주신 증상을 기준으로 ",
      },
      {
        type: "message",
        content: "몇 가지를 먼저 확인해볼게요.",
      },
      {
        type: "quick_replies",
        options: ["긁는 행동이 잦아요", "붉은 반점이 보여요"],
      },
      {
        type: "done",
      },
    ];

    for (const event of demoEvents) {
      await sleep(260);
      onEvent(event);
    }
    return;
  }

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
