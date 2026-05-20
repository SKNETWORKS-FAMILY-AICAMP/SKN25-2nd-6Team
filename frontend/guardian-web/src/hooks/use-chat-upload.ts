import { useState, type ChangeEvent } from "react";

import {
  getChatUploadPresignedUrl,
  uploadChatAttachment,
} from "../api/chat-api";

export interface PendingAttachment {
  fileName: string;
  contentType: string;
  cloudfrontUrl: string;
  previewUrl: string;
}

const allowedAttachmentTypes = ["image/jpeg", "image/png", "video/mp4"];

interface UseChatUploadParams {
  setErrorMessage: (message: string) => void;
  getErrorMessage: (error: unknown, fallbackMessage: string) => string;
}

export const useChatUpload = ({
  setErrorMessage,
  getErrorMessage,
}: UseChatUploadParams) => {
  const [pendingAttachment, setPendingAttachment] =
    useState<PendingAttachment | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  const clearPendingAttachment = () => {
    if (pendingAttachment?.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(pendingAttachment.previewUrl);
    }

    setPendingAttachment(null);
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

  return {
    pendingAttachment,
    setPendingAttachment,
    clearPendingAttachment,
    handleSelectAttachment,
    isUploadingAttachment,
  };
};
