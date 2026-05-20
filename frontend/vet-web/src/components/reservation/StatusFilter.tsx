import type { ReservationStatus } from "../../types/reservation";
import {
  reservationStatusMeta,
  statusOrder,
} from "../../utils/reservationUtils";

interface StatusFilterProps {
  counts: Record<ReservationStatus, number>;
}

export function StatusFilter({ counts }: StatusFilterProps) {
  return (
    <section className="rounded-lg border border-[#e5eaf2] bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-sm font-extrabold text-[#151b28]">상태 필터</h2>
      <div className="space-y-3">
        {statusOrder.map((status) => {
          const meta = reservationStatusMeta[status];

          return (
            <div key={status} className="flex items-center justify-between">
              <span
                className={`rounded-md px-3 py-1.5 text-sm font-extrabold ${meta.softClass}`}
              >
                {meta.label}
              </span>
              <span className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-[#edf1f6] bg-white px-2 text-sm font-extrabold text-[#20283a]">
                {counts[status] ?? 0}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
