import type {
  PatientsById,
  ReservationItem,
} from "../../types/reservation";
import {
  TODAY,
  getDateKey,
  getWeekDays,
  isSameDate,
  reservationStatusMeta,
  reservationTimes,
  weekDayLabels,
  weeklyBadgeClass,
  weeklyCardClass,
} from "../../utils/reservationUtils";

interface WeeklyScheduleProps {
  selectedDate: Date;
  reservations: ReservationItem[];
  patientsById: PatientsById;
  onSelectReservation: (reservation: ReservationItem, reservationDate: Date) => void;
}

export function WeeklySchedule({
  selectedDate,
  reservations,
  patientsById,
  onSelectReservation,
}: WeeklyScheduleProps) {
  const weekDays = getWeekDays(selectedDate);

  return (
    <div className="px-4 pb-4">
      <section className="overflow-hidden rounded-lg border border-[#e5eaf2] bg-white shadow-sm">
        <div className="grid grid-cols-[70px_repeat(7,minmax(120px,1fr))] border-b border-[#e5eaf2]">
          <div className="border-r border-[#e5eaf2] bg-white" />
          {weekDays.map((day, index) => {
            const isToday = isSameDate(day, TODAY);
            const isSunday = day.getDay() === 0;

            return (
              <div
                key={day.toISOString()}
                className={[
                  "flex h-11 items-center justify-center gap-2 border-r border-[#e5eaf2] text-sm font-extrabold last:border-r-0",
                  isSunday ? "text-[#ef4444]" : "text-[#1d2a57]",
                ].join(" ")}
              >
                <span>
                  {String(day.getMonth() + 1).padStart(2, "0")}.
                  {String(day.getDate()).padStart(2, "0")} ({weekDayLabels[index]})
                </span>
                {isToday && (
                  <span className="rounded-full bg-[#0f62fe] px-2 py-0.5 text-xs text-white">
                    오늘
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {reservationTimes.map((time) => {
          const isLunch = time === "12:00";

          if (isLunch) {
            return (
              <div
                key={time}
                className="grid grid-cols-[70px_1fr] border-b border-[#edf1f6]"
              >
                <div className="border-r border-[#e5eaf2] px-3 py-2 text-sm font-extrabold text-[#1d2a57]">
                  12:00
                </div>
                <div className="flex h-9 items-center justify-center bg-[#f3f5f8] text-sm font-extrabold text-[#53617c]">
                  점심시간 (12:00 - 13:00)
                </div>
              </div>
            );
          }

          return (
            <div
              key={time}
              className="grid grid-cols-[70px_repeat(7,minmax(120px,1fr))] border-b border-[#edf1f6] last:border-b-0"
            >
              <div className="border-r border-[#e5eaf2] px-3 py-3 text-sm font-extrabold text-[#1d2a57]">
                {time}
              </div>
              {weekDays.map((day) => {
                const dayKey = getDateKey(day);
                const reservation = reservations.find(
                  (item) => item.date === dayKey && item.start === time
                );
                const patient = reservation
                  ? patientsById[reservation.patientId]
                  : undefined;

                return (
                  <div
                    key={`${day.toISOString()}-${time}`}
                    className="min-h-[54px] border-r border-[#edf1f6] p-1.5 last:border-r-0"
                  >
                    {reservation && patient ? (
                      <button
                        type="button"
                        onClick={() => onSelectReservation(reservation, day)}
                        className={`relative h-full min-h-[48px] w-full overflow-hidden rounded-lg border px-3 py-2 pl-4 text-left shadow-sm transition before:absolute before:left-0 before:top-0 before:h-full before:w-1 hover:-translate-y-0.5 ${weeklyCardClass[reservation.status]}`}
                      >
                        <p className="truncate text-[13px] font-extrabold">
                          {patient.petName} ({patient.guardianName})
                        </p>
                        <p className="mt-0.5 truncate text-xs font-extrabold">
                          {reservation.visitReason}
                        </p>
                        <span
                          className={`absolute bottom-1.5 right-2 rounded-md px-2 py-0.5 text-xs font-extrabold ${weeklyBadgeClass[reservation.status]}`}
                        >
                          {reservationStatusMeta[reservation.status].label}
                        </span>
                      </button>
                    ) : (
                      <div className="flex h-full min-h-[48px] items-center px-2 text-sm font-extrabold text-[#a4adbd]">
                        -
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </section>

      <Legend />
    </div>
  );
}

function Legend() {
  const items: Array<{ label: string; className: string }> = [
    { label: "응급", className: "bg-[#e7a6af]" },
    { label: "준응급", className: "bg-[#e8b77f]" },
    { label: "일반", className: "bg-[#9eb8ea]" },
    { label: "예약 없음", className: "bg-[#e7ebf2]" },
  ];

  return (
    <div className="mx-auto mt-3 flex w-fit items-center gap-7 rounded-lg border border-[#e5eaf2] bg-white px-6 py-2.5 shadow-sm">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-sm font-extrabold text-[#53617c]">
          <span className={`h-3 w-3 rounded-full ${item.className}`} />
          {item.label}
        </div>
      ))}
    </div>
  );
}
