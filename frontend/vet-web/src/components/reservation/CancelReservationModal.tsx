import { AlertTriangle, X } from "lucide-react";

interface CancelReservationModalProps {
  patientName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function CancelReservationModal({
  patientName,
  onClose,
  onConfirm,
}: CancelReservationModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#111827]/55 px-4">
      <div className="w-full max-w-[520px] rounded-2xl bg-white px-10 py-9 text-center shadow-2xl">
        <div className="relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-0 top-0 text-[#3f4960]"
            aria-label="닫기"
          >
            <X className="h-7 w-7" />
          </button>
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#f4b252] text-[#f4a62a]">
            <AlertTriangle className="h-10 w-10" />
          </div>
          <h2 className="mt-8 text-3xl font-extrabold text-[#20283a]">
            예약을 정말 취소하시겠습니까?
          </h2>
          <p className="mt-6 text-lg font-extrabold leading-8 text-[#9aa3b3]">
            {patientName}의 취소된 예약은 복구할 수 없습니다.
            <br />
            정말로 취소하시겠습니까?
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={onClose}
              className="h-14 rounded-lg border border-[#e4e9f1] text-lg font-extrabold text-[#6b7486]"
            >
              아니요
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="h-14 rounded-lg bg-[#ef4444] text-lg font-extrabold text-white"
            >
              네, 취소할게요
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
