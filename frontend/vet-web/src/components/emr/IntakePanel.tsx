import { X } from "lucide-react";
import type { EmrResult } from "../../types/emr";
import { Panel } from "./EmrShared";

export function IntakePanel({
  emr,
  visibleFiles,
  hiddenFileCount,
  onApplyIntake,
  onPreviewImage,
  isReadOnly = false,
}: {
  emr: EmrResult;
  visibleFiles: string[];
  hiddenFileCount: number;
  onApplyIntake: (target: "summary" | "memo" | "all") => void;
  onPreviewImage: (url: string, label: string) => void;
  isReadOnly?: boolean;
}) {
  const summary = emr.triage_summary.summary;
  const memo = emr.triage_summary.memo;
  const preVisitReport = emr.triage_summary.preVisitReport;
  const suspectedKeywords = emr.triage_summary.suspectedKeywords ?? [];

  return (
    <Panel className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between px-4 py-2.5">
        <h2 className="text-sm font-extrabold text-[#151b28]">
          사전 문진 / 메모
        </h2>
        <button type="button" aria-label="닫기">
          <X className="h-4 w-4 text-[#697386]" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-4 pb-3">
        <button
          type="button"
          onClick={() => onApplyIntake("all")}
          disabled={isReadOnly}
          className="h-8 w-full rounded-lg bg-[#edf5ff] text-xs font-extrabold text-[#2f7df6] transition hover:bg-[#dcecff] disabled:cursor-not-allowed disabled:bg-[#f1f4f8] disabled:text-[#a8b0bf]"
        >
          사전문진 + 메모 전체 옮기기
        </button>

        <div className="rounded-lg border border-[#edf1f6] p-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-extrabold text-[#20283a]">
              AI 요약 문진
            </p>
            <button
              type="button"
              onClick={() => onApplyIntake("summary")}
              disabled={summary.length === 0 || isReadOnly}
              className="rounded-md bg-[#edf5ff] px-2 py-1 text-xs font-extrabold text-[#2f7df6] transition hover:bg-[#dcecff] disabled:text-[#a8b0bf]"
            >
              옮기기
            </button>
          </div>
          {summary.length > 0 ? (
            <div className="space-y-2.5">
              <ul className="space-y-1.5 text-xs font-bold leading-5 text-[#59657a]">
                {summary.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4a89ff]" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>

              {preVisitReport && (
                <div className="rounded-lg border border-[#ffd65a] bg-[#fffbeb] px-2.5 py-2">
                  <p className="mb-1.5 text-xs font-extrabold text-[#8a3b12]">
                    예약 전 경과 보고
                  </p>
                  <p className="text-xs font-bold leading-5 text-[#8a3b12]">
                    {preVisitReport}
                  </p>
                </div>
              )}

              {suspectedKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {suspectedKeywords.slice(0, 3).map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full border border-[#dfe4ec] bg-[#f8fafc] px-2.5 py-1 text-xs font-bold text-[#364155] shadow-sm"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs font-bold text-[#8a94a6]">
              예약 사전문진 내용이 없습니다.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-[#edf1f6] bg-[#fbfcfe] p-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-extrabold text-[#20283a]">메모</p>
            <button
              type="button"
              onClick={() => onApplyIntake("memo")}
              disabled={!memo || isReadOnly}
              className="rounded-md bg-[#edf5ff] px-2 py-1 text-xs font-extrabold text-[#2f7df6] transition hover:bg-[#dcecff] disabled:text-[#a8b0bf]"
            >
              옮기기
            </button>
          </div>
          <p className="text-xs font-bold leading-5 text-[#59657a]">
            {memo ?? "수의사 메모가 없습니다."}
          </p>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs font-extrabold text-[#20283a]">
              첨부 파일
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {visibleFiles.length === 0 && (
              <div className="col-span-4 rounded-lg bg-[#f8fafc] px-3 py-3 text-center text-xs font-bold text-[#8a94a6]">
                보호자 첨부 파일 없음
              </div>
            )}
            {visibleFiles.map((fileUrl, index) => (
              <button
                type="button"
                key={fileUrl}
                onClick={() => onPreviewImage(fileUrl, `보호자 첨부 ${index + 1}`)}
                className="relative h-12 overflow-hidden rounded-lg bg-[#edf1f6]"
              >
                <img
                  src={fileUrl}
                  alt={`보호자 첨부 ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                {index === 3 && hiddenFileCount > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#1f2937]/55 text-sm font-extrabold text-white">
                    +{hiddenFileCount}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}
