import { useMemo } from "react";
import type { ReservationItem } from "../../types/reservation";
import {
  TODAY,
  getDateKey,
  getHolidayName,
  getMonthGrid,
  isSameDate,
} from "../../utils/reservationUtils";

interface MonthlyCalendarProps {
  selectedDate: Date;
  reservations: ReservationItem[];
  onSelectDate: (date: Date) => void;
}

export function MonthlyCalendar({
  selectedDate,
  reservations,
  onSelectDate,
}: MonthlyCalendarProps) {
  const monthDays = getMonthGrid(selectedDate);

  const countByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const reservation of reservations) {
      map[reservation.date] = (map[reservation.date] ?? 0) + 1;
    }
    return map;
  }, [reservations]);

  return (
    <div className="px-4 pb-4">
      <section className="overflow-hidden rounded-lg border border-[#e5eaf2] bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-[#e5eaf2]">
          {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
            <div
              key={day}
              className="flex h-10 items-center justify-center border-r border-[#e5eaf2] text-sm font-extrabold text-[#1d2a57] last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {monthDays.map((day) => {
            const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
            const isToday = isSameDate(day, TODAY);
            const isSunday = day.getDay() === 0;
            const isSaturday = day.getDay() === 6;
            const holidayName = getHolidayName(day);

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onSelectDate(day)}
                className={[
                  "min-h-[96px] border-r border-b border-[#edf1f6] p-4 text-left transition hover:bg-[#f8fbff]",
                  isToday ? "border-[#0f62fe] ring-1 ring-[#0f62fe]" : "",
                ].join(" ")}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={[
                      "text-base font-extrabold",
                      !isCurrentMonth
                        ? "text-[#b8c0cf]"
                        : isSunday || holidayName
                          ? "text-[#ef4444]"
                          : isSaturday
                            ? "text-[#0f62fe]"
                            : "text-[#1d2a57]",
                    ].join(" ")}
                  >
                    {day.getDate()}
                  </span>
                  {holidayName && (
                    <span className="text-xs font-extrabold text-[#ef4444]">
                      {holidayName}
                    </span>
                  )}
                  {isToday && (
                    <span className="ml-auto rounded-full bg-[#0f62fe] px-2 py-0.5 text-xs font-extrabold text-white">
                      오늘
                    </span>
                  )}
                </div>
                <span
                  className={[
                    "mt-4 inline-flex rounded-lg px-3 py-1.5 text-sm font-extrabold",
                    isCurrentMonth
                      ? "bg-[#f5f8ff] text-[#1d2a57]"
                      : "bg-[#f7f8fa] text-[#a4adbd]",
                  ].join(" ")}
                >
                  총 {countByDate[getDateKey(day)] ?? 0}건
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-lg border border-[#e5eaf2] bg-white px-5 py-2.5 text-sm font-extrabold text-[#53617c] shadow-sm">
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#0f62fe] text-xs text-[#0f62fe]">
          i
        </span>
        일별 예약 총 건수를 표시합니다.
      </div>
    </div>
  );
}
