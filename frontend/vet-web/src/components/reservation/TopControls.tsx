import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCcw,
} from "lucide-react";
import type { ReservationViewMode } from "../../types/reservation";
import { IconButton } from "./IconButton";

interface TopControlsProps {
  controlLabel: string;
  viewMode: ReservationViewMode;
  isLoading: boolean;
  onChangeViewMode: (mode: ReservationViewMode) => void;
  onAdd: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onRefresh: () => void;
}

export function TopControls({
  controlLabel,
  viewMode,
  isLoading,
  onChangeViewMode,
  onAdd,
  onPrev,
  onNext,
  onToday,
  onRefresh,
}: TopControlsProps) {
  return (
    <div className="grid h-[68px] grid-cols-[1fr_auto_1fr] items-center border-b border-[#edf1f6] bg-white px-4">
      <div className="flex min-w-0 items-center gap-2">
        <IconButton label="이전 날짜" onClick={onPrev}>
          <ChevronLeft className="h-5 w-5" />
        </IconButton>
        <button
          type="button"
          className="flex h-10 min-w-0 max-w-[360px] items-center gap-2 truncate rounded-lg border border-[#dfe6f1] bg-white px-3 text-sm font-extrabold text-[#20283a]"
        >
          <CalendarDays className="h-4 w-4 text-[#53617c]" />
          {controlLabel}
        </button>
        <IconButton label="다음 날짜" onClick={onNext}>
          <ChevronRight className="h-5 w-5" />
        </IconButton>
        <button
          type="button"
          onClick={onToday}
          className="ml-2 h-10 rounded-lg border border-[#dfe6f1] bg-white px-4 text-sm font-extrabold text-[#4d5874]"
        >
          오늘
        </button>
      </div>

      <div className="flex items-center justify-center gap-3">
        {[
          ["day", "일간"],
          ["week", "주간"],
          ["month", "월간"],
        ].map(([mode, label]) => (
          <button
            key={label}
            type="button"
            onClick={() => onChangeViewMode(mode as ReservationViewMode)}
            className={[
              "h-10 rounded-lg px-5 text-sm font-extrabold transition",
              viewMode === mode
                ? "bg-[#0f62fe] text-white shadow-sm"
                : "border border-[#dfe6f1] bg-white text-[#4d5874]",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="flex h-10 items-center gap-2 rounded-lg border border-[#dfe6f1] bg-white px-4 text-sm font-extrabold text-[#4d5874] disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          새로고침
        </button>
        <button
          type="button"
          onClick={onAdd}
          className="flex h-10 items-center gap-2 rounded-lg bg-[#0f62fe] px-5 text-sm font-extrabold text-white shadow-sm"
        >
          <Plus className="h-4 w-4" />
          예약 추가
        </button>
      </div>
    </div>
  );
}
