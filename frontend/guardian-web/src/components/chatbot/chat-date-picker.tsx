import { useEffect, useState } from "react";
import { getAvailableScheduleSlots } from "../../api/schedule-api";

interface ChatDatePickerProps {
  onSelectSlot: (date: string, time: string, doctorid: number, label: string) => void;
  onCancel: () => void;
}

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

const fmt2 = (n: number) => String(n).padStart(2, "0");

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${fmt2(d.getMonth() + 1)}-${fmt2(d.getDate())}`;

const ChatDatePicker = ({ onSelectSlot, onCancel }: ChatDatePickerProps) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<{ start_time: string; doctorid?: number }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // 달력 셀 생성
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewYear, viewMonth, i + 1)),
  ];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // 날짜 선택 시 슬롯 조회
  useEffect(() => {
    if (!selectedDate) return;
    setSlots([]);
    setLoadingSlots(true);
    getAvailableScheduleSlots({ date: toDateStr(selectedDate), duration_min: 30 })
      .then(resp => { if (resp.code === 200) setSlots(resp.result); })
      .catch(() => {})
      .finally(() => setLoadingSlots(false));
  }, [selectedDate]);

  const isSelectable = (d: Date | null) => {
    if (!d) return false;
    const diff = (d.getTime() - today.getTime()) / 86400000;
    return diff >= 0 && diff <= 30;
  };

  const isSelected = (d: Date | null) =>
    d && selectedDate && toDateStr(d) === toDateStr(selectedDate);

  return (
    <div className="border-t border-blue-100 bg-blue-50/60 px-4 py-4">
      {/* 달력 헤더 */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-extrabold text-slate-800">
          {viewYear}년 {viewMonth + 1}월
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded-lg px-2 py-1 text-xs font-black text-slate-500 hover:bg-white"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-lg px-2 py-1 text-xs font-black text-slate-500 hover:bg-white"
          >
            ▶
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="ml-2 rounded-lg px-2 py-1 text-xs font-black text-slate-400 hover:bg-white hover:text-rose-500"
          >
            닫기
          </button>
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {DAYS.map((d, i) => (
          <span
            key={d}
            className={`text-[10px] font-extrabold ${i === 0 ? "text-rose-400" : i === 6 ? "text-blue-500" : "text-slate-400"}`}
          >
            {d}
          </span>
        ))}
      </div>

      {/* 날짜 셀 */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, idx) => {
          const selectable = isSelectable(d);
          const selected = isSelected(d);
          const isPast = d && d.getTime() < today.getTime();
          return (
            <button
              key={idx}
              type="button"
              disabled={!selectable}
              onClick={() => d && selectable && setSelectedDate(d)}
              className={[
                "aspect-square rounded-lg text-xs font-bold transition",
                !d ? "invisible" : "",
                selected ? "bg-blue-600 text-white shadow-sm" : "",
                !selected && selectable ? "hover:bg-white text-slate-700" : "",
                !selected && isPast ? "text-slate-300 cursor-not-allowed" : "",
                !selected && !selectable && !isPast ? "text-slate-300 cursor-not-allowed" : "",
              ].join(" ")}
            >
              {d?.getDate()}
            </button>
          );
        })}
      </div>

      {/* 선택된 날짜의 슬롯 */}
      {selectedDate && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-extrabold text-slate-600">
            {viewMonth + 1}월 {selectedDate.getDate()}일 예약 가능 시간
          </p>
          {loadingSlots ? (
            <p className="text-xs text-slate-400">슬롯 조회 중...</p>
          ) : slots.length === 0 ? (
            <p className="text-xs text-slate-400">예약 가능한 시간이 없습니다.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {slots.map(s => {
                const time = s.start_time.slice(0, 5);
                const [, m, dd] = toDateStr(selectedDate).split("-");
                const label = `${m}월 ${dd}일 ${time}`;
                return (
                  <button
                    key={s.start_time}
                    type="button"
                    onClick={() =>
                      onSelectSlot(toDateStr(selectedDate), time, s.doctorid ?? 1, label)
                    }
                    className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-black text-white shadow-sm transition hover:bg-blue-700"
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatDatePicker;
