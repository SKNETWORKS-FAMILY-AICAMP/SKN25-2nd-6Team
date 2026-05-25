import type { ReservationStatus } from "../../types/reservation";
import {
  reservationStatusMeta,
  statusOrder,
} from "../../utils/reservationUtils";

interface StatusFilterProps {
  counts: Record<ReservationStatus, number>;
  activeStatus: ReservationStatus | null;
  onChangeStatus: (status: ReservationStatus | null) => void;
}

export function StatusFilter({
  counts,
  activeStatus,
  onChangeStatus,
}: StatusFilterProps) {
  return (
    <section className="rounded-lg border border-[#e5eaf2] bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-extrabold text-[#151b28]">상태 필터</h2>
        {activeStatus && (
          <button
            type="button"
            onClick={() => onChangeStatus(null)}
            className="rounded-md border border-[#dfe6f1] px-2 py-1 text-xs font-extrabold text-[#53617c]"
          >
            전체
          </button>
        )}
      </div>
      <div className="space-y-3">
        {statusOrder.map((status) => {
          const meta = reservationStatusMeta[status];
          const isActive = activeStatus === status;

          return (
            <button
              key={status}
              type="button"
              onClick={() => onChangeStatus(isActive ? null : status)}
              className={[
                "flex w-full items-center justify-between rounded-lg p-1.5 text-left transition",
                isActive
                  ? "bg-[#f5f8ff] ring-2 ring-[#0f62fe]/20"
                  : "hover:bg-[#f7f9fc]",
              ].join(" ")}
            >
              <span
                className={`rounded-md px-3 py-1.5 text-sm font-extrabold ${meta.softClass}`}
              >
                {meta.label}
              </span>
              <span className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-[#edf1f6] bg-white px-2 text-sm font-extrabold text-[#20283a]">
                {counts[status] ?? 0}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
