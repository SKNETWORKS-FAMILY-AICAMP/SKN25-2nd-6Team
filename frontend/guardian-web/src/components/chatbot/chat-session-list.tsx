import type { ChatSessionHistory } from "../../api/chat-api";
import type { Pet } from "../../api/pets-api";

interface ChatSessionListProps {
  selectedPet?: Pet;
  chatHistories: ChatSessionHistory[];
  selectedHistoryId: number | null;
  isLoadingHistories: boolean;
  creatingPetId: number | null;
  onCreateSession: () => void;
  onSelectHistory: (historyId: number) => void;
  onDeleteHistory: (history: ChatSessionHistory) => void;
  getHistoryTitle: (history: ChatSessionHistory) => string;
}

const ChatSessionList = ({
  selectedPet,
  chatHistories,
  selectedHistoryId,
  isLoadingHistories,
  creatingPetId,
  onCreateSession,
  onSelectHistory,
  onDeleteHistory,
  getHistoryTitle,
}: ChatSessionListProps) => {
  return (
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
              onClick={onCreateSession}
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
                  const isSelected = history.session_id === selectedHistoryId;

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
                        onClick={() => onSelectHistory(history.session_id)}
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
                        onClick={() => onDeleteHistory(history)}
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
  );
};

export default ChatSessionList;
