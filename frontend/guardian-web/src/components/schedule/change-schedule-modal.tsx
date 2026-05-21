import { useEffect, useMemo, useState } from "react";

import {
  getAvailableScheduleSlots,
  updateSchedule,
} from "../../api/schedule-api";
import type {
  AvailableScheduleSlot,
  ScheduleListItem,
} from "../../types/schedule";
import {
  buildKstDateTime,
  formatDateInput,
  formatScheduleTimeRange,
  getErrorMessage,
  getProfileImage,
} from "./schedule-utils";

interface ChangeScheduleModalProps {
  schedule: ScheduleListItem;
  onClose: () => void;
  onChanged: () => void;
}

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

const ChangeScheduleModal = ({
  schedule,
  onClose,
  onChanged,
}: ChangeScheduleModalProps) => {
  const initialDate = useMemo(
    () => formatDateInput(new Date(schedule.confirmed_time)),
    [schedule.confirmed_time],
  );

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(`${initialDate}T00:00:00`),
  );
  const [slots, setSlots] = useState<AvailableScheduleSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableScheduleSlot | null>(
    null,
  );
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const monthDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const leadingEmptyDays = firstDay.getDay();
    const days: Array<string | null> = Array.from(
      { length: leadingEmptyDays },
      () => null,
    );

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      days.push(formatDateInput(new Date(year, month, day)));
    }

    return days;
  }, [calendarMonth]);

  useEffect(() => {
    let isMounted = true;

    const loadSlots = async () => {
      try {
        setIsLoadingSlots(true);
        setErrorMessage("");
        setSelectedSlot(null);

        const response = await getAvailableScheduleSlots({
          date: selectedDate,
          doctorid: schedule.doctorid,
          duration_min: schedule.duration_min,
        });

        if (!isMounted) return;

        if (response.code !== 200) {
          setErrorMessage(
            response.message || "예약 가능 시간을 불러오지 못했습니다.",
          );
          setSlots([]);
          return;
        }

        setSlots(response.result);
      } catch (error) {
        if (!isMounted) return;

        setErrorMessage(
          getErrorMessage(error, "예약 가능 시간을 불러오지 못했습니다."),
        );
        setSlots([]);
      } finally {
        if (isMounted) setIsLoadingSlots(false);
      }
    };

    loadSlots();

    return () => {
      isMounted = false;
    };
  }, [schedule.doctorid, schedule.duration_min, selectedDate]);

  const handleChangeMonth = (diff: number) => {
    setCalendarMonth(
      (currentMonth) =>
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + diff, 1),
    );
  };

  const handleSubmit = async () => {
    if (!selectedSlot) return;

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const response = await updateSchedule(schedule.schedule_id, {
        confirmed_time: buildKstDateTime(selectedDate, selectedSlot.start_time),
        duration_min: schedule.duration_min,
      });

      if (response.code !== 200) {
        setErrorMessage(response.message || "예약 변경에 실패했습니다.");
        return;
      }

      onChanged();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "예약 변경에 실패했습니다."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 px-4">
      <section className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl shadow-slate-900/20">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-black text-slate-950">예약 변경</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="예약 변경 모달 닫기"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="flex items-center gap-4">
            <img
              src={getProfileImage(schedule)}
              alt={`${schedule.pet_name} 프로필`}
              className="h-14 w-14 rounded-full object-cover"
            />
            <div>
              <p className="text-base font-black text-slate-950">
                {schedule.pet_name}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-500">
                {schedule.category}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
            현재 예약:{" "}
            {formatScheduleTimeRange(
              schedule.confirmed_time,
              schedule.confirmed_end_time,
            )}
            <span className="ml-3 text-blue-500">
              담당 {schedule.doctor_name}
            </span>
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
            <section className="rounded-xl border border-slate-100 p-4">
              <div className="mb-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleChangeMonth(-1)}
                  className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-50"
                >
                  &lt;
                </button>
                <h3 className="text-sm font-black text-slate-900">
                  {calendarMonth.getFullYear()}년 {calendarMonth.getMonth() + 1}월
                </h3>
                <button
                  type="button"
                  onClick={() => handleChangeMonth(1)}
                  className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-50"
                >
                  &gt;
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-black text-slate-400">
                {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                  <div key={day} className="py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((date, index) =>
                  date ? (
                    <button
                      key={date}
                      type="button"
                      onClick={() => setSelectedDate(date)}
                      className={[
                        "h-9 rounded-lg text-sm font-bold transition",
                        selectedDate === date
                          ? "bg-blue-600 text-white"
                          : "text-slate-600 hover:bg-blue-50 hover:text-blue-600",
                      ].join(" ")}
                    >
                      {Number(date.slice(-2))}
                    </button>
                  ) : (
                    <div key={`empty-${index}`} className="h-9" />
                  ),
                )}
              </div>
            </section>

            <section className="rounded-xl border border-slate-100 p-4">
              <h3 className="text-sm font-black text-slate-900">
                시간 및 진료 시간 선택
              </h3>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {selectedDate} 기준 예약 가능 시간입니다.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {isLoadingSlots ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-10 animate-pulse rounded-lg bg-slate-100"
                    />
                  ))
                ) : slots.length > 0 ? (
                  slots.map((slot) => {
                    const isSelected =
                      selectedSlot?.start_time === slot.start_time;

                    return (
                      <button
                        key={`${slot.doctorid}-${slot.start_time}-${slot.end_time}`}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={[
                          "h-10 rounded-lg border text-sm font-black transition",
                          isSelected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-blue-100 text-blue-600 hover:bg-blue-50",
                        ].join(" ")}
                      >
                        {slot.start_time}
                      </button>
                    );
                  })
                ) : (
                  <p className="col-span-3 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">
                    예약 가능한 시간이 없습니다.
                  </p>
                )}
              </div>

              {selectedSlot ? (
                <div className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
                  선택 시간: {selectedDate} {selectedSlot.start_time} -{" "}
                  {selectedSlot.end_time}
                </div>
              ) : null}
            </section>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-11 rounded-xl border border-slate-200 px-6 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedSlot || isSubmitting}
            className="h-11 rounded-xl bg-blue-600 px-6 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {isSubmitting ? "변경 중" : "변경하기"}
          </button>
        </div>
      </section>
    </div>
  );
};

export default ChangeScheduleModal;