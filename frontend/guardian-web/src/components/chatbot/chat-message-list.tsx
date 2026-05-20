import type { ChatMessage } from "../../hooks/use-chat-conversation";

interface ChatMessageListProps {
  messages: ChatMessage[];
  quickReplies: string[];
  isStreaming: boolean;
  onSendMessage: (content: string) => void;
}

const ChatMessageList = ({
  messages,
  quickReplies,
  isStreaming,
  onSendMessage,
}: ChatMessageListProps) => {
  return (
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
              onClick={() => onSendMessage(reply)}
              disabled={isStreaming}
              className="rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-black text-blue-600 transition hover:bg-blue-50 disabled:opacity-60"
            >
              {reply}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default ChatMessageList;
