import { useState } from "react";

import { cancelSchedule } from "../../api/schedule-api";
import type { ScheduleListItem } from "../../types/schedule";
import { getErrorMessage } from "./schedule-utils";

interface CancelScheduleModalProps {
  schedule: ScheduleListItem;
  onClose: () => void;
  onCancelled: () => void;
}

const WarningIcon = () => (
  <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" aria-hidden="true">
    <path
      d="M12 8v5M12 17h.01M10.3 4.7 2.9 17.5A2 2 0 0 0 4.6 20h14.8a2 2 0 0 0 1.7-2.5L13.7 4.7a2 2 0 0 0-3.4 0Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
    <path
      d="m6 6 12 12M18 6 6 18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const CancelScheduleModal = ({
  schedule,
  onClose,
  onCancelled,
}: CancelScheduleModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleCancel = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const response = await cancelSchedule(schedule.schedule_id);

      if (response.code !== 200) {
        setErrorMessage(response.message || "예약 취소에 실패했습니다.");
        return;
      }

      onCancelled();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "예약 취소에 실패했습니다."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 px-4">
      <section className="w-full max-w-md rounded-2xl bg-white px-8 py-8 text-center shadow-2xl shadow-slate-900/20">
        <button
          type="button"
          onClick={onClose}
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
          aria-label="예약 취소 모달 닫기"
        >
          <CloseIcon />
        </button>

        <div className="mx-auto mt-2 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-amber-500">
          <WarningIcon />
        </div>

        <h2 className="mt-6 text-xl font-black text-slate-950">
          예약을 정말 취소하시겠습니까?
        </h2>

        <p className="mt-3 text-sm font-bold leading-6 text-slate-500">
          취소된 예약은 복구할 수 없습니다.
        </p>

        {errorMessage ? (
          <div className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-11 rounded-xl border border-slate-200 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            아니요
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="h-11 rounded-xl bg-rose-500 text-sm font-black text-white shadow-lg shadow-rose-100 transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {isSubmitting ? "취소 중" : "네, 취소할게요"}
          </button>
        </div>
      </section>
    </div>
  );
};

export default CancelScheduleModal;