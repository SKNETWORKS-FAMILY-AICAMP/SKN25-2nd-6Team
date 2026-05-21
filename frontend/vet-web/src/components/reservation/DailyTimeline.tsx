import type {
  PatientsById,
  ReservationItem,
} from "../../types/reservation";
import {
  dayLabels,
  getReservationAt,
  reservationStatusMeta,
  reservationTimes,
} from "../../utils/reservationUtils";

interface DailyTimelineProps {
  selectedDate: Date;
  reservations: ReservationItem[];
  patientsById: PatientsById;
  selectedReservationId: number;
  onSelect: (id: number) => void;
}

export function DailyTimeline({
  selectedDate,
  reservations,
  patientsById,
  selectedReservationId,
  onSelect,
}: DailyTimelineProps) {
  return (
    <section className="h-full overflow-hidden rounded-lg border border-[#e5eaf2] bg-white p-4 shadow-sm">
      <div className="mb-2 text-center">
        <p className="text-base font-extrabold text-[#151b28]">
          {dayLabels[selectedDate.getDay()]}요일
        </p>
        <p className="text-sm font-extrabold text-[#1d2a57]">
          {selectedDate.getMonth() + 1}/{selectedDate.getDate()}
        </p>
      </div>

      <div className="space-y-1.5">
        {reservationTimes.map((time) => {
          const reservation = getReservationAt(reservations, time);
          const patient = reservation ? patientsById[reservation.patientId] : undefined;
          const isLunch = time === "12:00";

          return (
            <div key={time} className="grid grid-cols-[58px_1fr] gap-3">
              <div className="pt-3 text-sm font-extrabold tabular-nums text-[#1d2a57]">
                {time}
              </div>
              {isLunch ? (
                <div className="flex h-[42px] items-center gap-8 rounded-lg border border-[#edf1f6] bg-[#f7f8fa] px-4 text-sm font-extrabold text-[#1d2a57]">
                  <span>12:00 ~ 13:00</span>
                  <span>점심시간</span>
                </div>
              ) : reservation && patient ? (
                <button
                  type="button"
                  onClick={() => onSelect(reservation.id)}
                  className={[
                    "flex h-[50px] w-full items-center gap-3 rounded-lg border bg-white px-3 text-left transition",
                    selectedReservationId === reservation.id
                      ? "border-[#0f62fe] shadow-[0_0_0_2px_rgba(15,98,254,0.08)]"
                      : "border-[#edf1f6] hover:border-[#b8cdfc]",
                  ].join(" ")}
                >
                  <img
                    src={patient.imageUrl}
                    alt={patient.petName}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold tabular-nums text-[#1d2a57]">
                      {reservation.start} ~ {reservation.end}
                    </p>
                    <p className="truncate text-sm font-extrabold text-[#1d2a57]">
                      {patient.petName} ({patient.guardianName})
                    </p>
                  </div>
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-extrabold ${reservationStatusMeta[reservation.status].badgeClass}`}
                  >
                    {reservationStatusMeta[reservation.status].label}
                  </span>
                </button>
              ) : (
                <div className="h-[42px] rounded-lg border border-dashed border-[#edf1f6]" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
