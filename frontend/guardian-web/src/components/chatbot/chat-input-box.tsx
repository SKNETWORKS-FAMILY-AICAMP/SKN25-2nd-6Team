import type { ChangeEvent, FormEvent, RefObject } from "react";

import type { PendingAttachment } from "../../hooks/use-chat-upload";

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

const SendIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
    <path d="M5 12 19 5l-4 14-3-6-7-1Z" fill="currentColor" />
  </svg>
);

interface ChatInputBoxProps {
  fileInputRef: RefObject<HTMLInputElement>;
  pendingAttachment: PendingAttachment | null;
  messageInput: string;
  isStreaming: boolean;
  isUploadingAttachment: boolean;
  onClearPendingAttachment: () => void;
  onSelectAttachment: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmitMessage: (event: FormEvent<HTMLFormElement>) => void;
  onChangeMessageInput: (value: string) => void;
}

const ChatInputBox = ({
  fileInputRef,
  pendingAttachment,
  messageInput,
  isStreaming,
  isUploadingAttachment,
  onClearPendingAttachment,
  onSelectAttachment,
  onSubmitMessage,
  onChangeMessageInput,
}: ChatInputBoxProps) => {
  return (
    <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
      {pendingAttachment ? (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-800">
              {pendingAttachment.fileName}
            </p>
            <p className="mt-1 text-xs font-bold text-blue-600">첨부 완료</p>
          </div>
          <button
            type="button"
            onClick={onClearPendingAttachment}
            className="h-9 rounded-xl bg-white px-3 text-xs font-black text-slate-500 transition hover:text-blue-600"
          >
            삭제
          </button>
        </div>
      ) : null}
      <form
        onSubmit={onSubmitMessage}
        className="flex h-14 items-center gap-2 rounded-2xl bg-slate-50 p-1.5 ring-1 ring-slate-100"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,video/mp4"
          onChange={onSelectAttachment}
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
          onChange={(event) => onChangeMessageInput(event.target.value)}
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
  );
};

export default ChatInputBox;
