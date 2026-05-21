import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import type {
  ReservationFormState,
  ReservationItem,
  ReservationPatient,
} from "../../types/reservation";
import {
  TODAY,
  addMonths,
  dayLabels,
  formatDateWithWeekday,
  formatMonthTitle,
  getDateKey,
  getHolidayName,
  getMonthGrid,
  isSameDate,
} from "../../utils/reservationUtils";

// 예약 가능한 시작 시간(30분 단위, 점심 12:00~13:00 제외)
const TIME_OPTIONS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
];

interface ReservationFormModalProps {
  mode: "add" | "edit";
  selectedDate: Date;
  reservation?: ReservationItem;
  reservations: ReservationItem[];
  patient?: ReservationPatient;
  patientOptions: ReservationPatient[];
  doctorOptions: string[];
  onClose: () => void;
  onSave: (patient: ReservationPatient, form: ReservationFormState) => void;
}

export function ReservationFormModal({
  mode,
  selectedDate,
  reservation,
  reservations,
  patient,
  patientOptions,
  doctorOptions,
  onClose,
  onSave,
}: ReservationFormModalProps) {
  const [searchText, setSearchText] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<ReservationPatient | null>(
    mode === "edit" ? patient ?? null : null
  );
  const [reservationDate, setReservationDate] = useState(selectedDate);
  const [form, setForm] = useState<ReservationFormState>({
    date: formatDateWithWeekday(selectedDate),
    dateKey: getDateKey(selectedDate),
    time: reservation?.start ?? "17:00",
    doctorName: reservation?.doctorName ?? doctorOptions[0] ?? "",
    memo: reservation?.memo ?? "",
  });

  const filteredPatients = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) {
      return patientOptions;
    }

    return patientOptions.filter((item) =>
      `${item.petName} ${item.guardianName} ${item.phone} ${item.breed}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [searchText, patientOptions]);

  // 선택한 날짜에 이미 예약된 시작 시간(수정 중인 본인 예약은 제외)
  const bookedTimes = useMemo(() => {
    const taken = new Set<string>();
    for (const item of reservations) {
      if (item.date === form.dateKey && item.id !== reservation?.id) {
        taken.add(item.start);
      }
    }
    return taken;
  }, [reservations, form.dateKey, reservation?.id]);

  // 예약된 시간 + 오늘 기준 지난 시간은 선택지에서 숨긴다
  const availableTimeOptions = useMemo(() => {
    const isToday = form.dateKey === getDateKey(TODAY);
    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    return TIME_OPTIONS.filter((time) => {
      if (bookedTimes.has(time)) return false;
      if (isToday && time <= currentHHMM) return false;
      return true;
    });
  }, [bookedTimes, form.dateKey]);

  // 날짜를 바꿔 현재 선택한 시간이 예약 불가해지면 가능한 첫 시간으로 보정
  useEffect(() => {
    if (form.time && bookedTimes.has(form.time)) {
      setForm((current) => ({
        ...current,
        time: availableTimeOptions[0] ?? "",
      }));
    }
  }, [bookedTimes, availableTimeOptions, form.time]);

  const shouldShowSearchResults = isSearchFocused;
  const canSaveReservation = selectedPatient !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/55 px-4 py-3">
      <div className="flex max-h-[94vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-[#edf1f6] px-5 py-3">
          <h2 className="text-base font-extrabold text-[#151b28]">
            예약 {mode === "add" ? "추가" : "수정"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4d5874] hover:bg-[#f3f6fb]"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <div className="relative">
            <label className="mb-1.5 block text-xs font-extrabold text-[#1d2a57]">
              환자 검색
            </label>
            <div className="flex h-9 items-center rounded-lg border border-[#dfe6f1] px-3 focus-within:border-[#0f62fe]">
              <input
                value={searchText}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => window.setTimeout(() => setIsSearchFocused(false), 120)}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="강아지이름 / 전화번호 뒷자리 검색"
                className="min-w-0 flex-1 bg-transparent text-xs font-bold text-[#1d2a57] outline-none placeholder:text-[#a4adbd]"
              />
              <ChevronDown className="h-4 w-4 text-[#53617c]" />
            </div>
            {shouldShowSearchResults && (
              <div className="absolute left-0 right-0 top-[62px] z-10 max-h-64 overflow-y-auto rounded-lg border border-[#edf1f6] bg-white shadow-lg">
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedPatient(item);
                        setSearchText(`${item.petName} (${item.guardianName})`);
                        setIsSearchFocused(false);
                      }}
                      className="flex w-full items-center justify-between border-b border-[#f2f4f8] px-4 py-2.5 text-left last:border-b-0 hover:bg-[#f7f9fc]"
                    >
                      <span>
                        <span className="block text-sm font-extrabold text-[#1d2a57]">
                          {item.petName} ({item.guardianName})
                        </span>
                        <span className="mt-1 block text-xs font-bold text-[#8a94a6]">
                          {item.phone}
                        </span>
                      </span>
                      <span className="text-xs font-extrabold text-[#8a94a6]">
                        {item.species}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm font-bold text-[#8a94a6]">
                    검색 결과가 없습니다.
                  </div>
                )}
              </div>
            )}
          </div>

          <section>
            <h3 className="mb-2 text-sm font-extrabold text-[#1d2a57]">
              정보 확인
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <ReadonlyField label="강아지 이름" value={selectedPatient?.petName ?? ""} />
              <ReadonlyField label="생년월일" value={selectedPatient?.birthDate ?? ""} />
              <ReadonlyField label="종" value={selectedPatient?.species ?? ""} />
              <ReadonlyField label="몸무게" value={selectedPatient?.weight ?? ""} />
              <ReadonlyField label="품종" value={selectedPatient?.breed ?? ""} />
              <ReadonlyField
                label="마지막 정기검진날"
                value={selectedPatient?.lastCheckupDate ?? ""}
              />
              <ReadonlyField label="성별" value={selectedPatient?.gender ?? ""} />
              <ReadonlyField
                label="중성화 여부"
                value={
                  selectedPatient
                    ? selectedPatient.isNeutered
                      ? "중성화 O"
                      : "중성화 X"
                    : ""
                }
              />
            </div>
          </section>

          <section className="border-t border-[#edf1f6] pt-3">
            <h3 className="mb-2 text-sm font-extrabold text-[#1d2a57]">
              예약 정보
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <DatePickerField
                label="예약 날짜"
                selectedDate={reservationDate}
                onSelectDate={(date) => {
                  setReservationDate(date);
                  setForm((current) => ({
                    ...current,
                    date: formatDateWithWeekday(date),
                    dateKey: getDateKey(date),
                  }));
                }}
              />
              <SelectField
                label="예약 시간"
                value={form.time}
                options={availableTimeOptions}
                onChange={(value) => setForm((current) => ({ ...current, time: value }))}
              />
              <SelectField
                label="담당 수의사"
                value={form.doctorName}
                options={doctorOptions}
                onChange={(value) =>
                  setForm((current) => ({ ...current, doctorName: value }))
                }
              />
            </div>
            <label className="mt-3 block text-xs font-extrabold text-[#1d2a57]">
              <span className="mb-1 block">메모</span>
              <span className="relative">
                <textarea
                  value={form.memo}
                  maxLength={200}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, memo: event.target.value }))
                  }
                  className="h-20 w-full resize-none rounded-lg border border-[#dfe6f1] px-3 py-2 text-xs font-bold text-[#1d2a57] outline-none focus:border-[#0f62fe]"
                />
                <span className="absolute bottom-3 right-3 text-xs font-extrabold text-[#8a94a6]">
                  {form.memo.length} / 200
                </span>
              </span>
            </label>
          </section>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-4 px-5 pb-5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-[#b8cdfc] text-sm font-extrabold text-[#1d2a57]"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!canSaveReservation}
            onClick={() => {
              if (selectedPatient) {
                onSave(selectedPatient, form);
              }
            }}
            className="h-10 rounded-lg bg-[#0f62fe] text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:bg-[#b8c0cf]"
          >
            예약 저장
          </button>
        </div>
      </div>
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block min-w-0 text-xs font-extrabold text-[#1d2a57]">
      <span className="mb-1 block">{label}</span>
      <input
        readOnly
        value={value}
        className="h-8 w-full min-w-0 rounded-lg border border-[#edf1f6] bg-[#f8fafc] px-3 text-xs font-bold text-[#53617c] outline-none"
      />
    </label>
  );
}

function DatePickerField({
  label,
  selectedDate,
  onSelectDate,
}: {
  label: string;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ left: 0, top: 0 });
  const calendarButtonRef = useRef<HTMLButtonElement | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );
  const days = getMonthGrid(visibleMonth);

  const toggleCalendar = () => {
    const rect = calendarButtonRef.current?.getBoundingClientRect();

    if (rect) {
      const popoverWidth = 244;
      const left = Math.min(
        Math.max(12, rect.right - popoverWidth),
        window.innerWidth - popoverWidth - 12
      );
      setPopoverPosition({
        left,
        top: rect.bottom + 8,
      });
    }

    setIsOpen((open) => !open);
  };

  return (
    <label className="block min-w-0 text-xs font-extrabold text-[#1d2a57]">
      <span className="mb-1 block">{label}</span>
      <span className="flex h-8 min-w-0 items-center rounded-lg border border-[#dfe6f1] px-3">
        <input
          readOnly
          value={formatDateWithWeekday(selectedDate)}
          className="min-w-0 flex-1 cursor-default bg-transparent text-xs font-bold text-[#1d2a57] outline-none"
        />
        <button
          ref={calendarButtonRef}
          type="button"
          onClick={toggleCalendar}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[#53617c] hover:bg-[#edf5ff] hover:text-[#0f62fe]"
          aria-label="예약 날짜 선택"
        >
          <CalendarDays className="h-4 w-4" />
        </button>
      </span>

      {isOpen && (
        <div
          className="fixed z-[70] w-[244px] rounded-xl border border-[#dfe6f1] bg-white p-3 shadow-xl"
          style={{
            left: popoverPosition.left,
            top: popoverPosition.top,
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setVisibleMonth((date) => addMonths(date, -1))}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#53617c] hover:bg-[#f3f6fb]"
              aria-label="이전 달"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-extrabold text-[#1d2a57]">
              {formatMonthTitle(visibleMonth)}
            </span>
            <button
              type="button"
              onClick={() => setVisibleMonth((date) => addMonths(date, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#53617c] hover:bg-[#f3f6fb]"
              aria-label="다음 달"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-extrabold text-[#8a94a6]">
            {dayLabels.map((day) => (
              <span key={day}>{day}</span>
            ))}
            {days.map((day) => {
              const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
              const isSelected = isSameDate(day, selectedDate);
              const isToday = isSameDate(day, TODAY);
              const isHoliday = Boolean(getHolidayName(day));
              const isSunday = day.getDay() === 0;
              const isSaturday = day.getDay() === 6;
              const isPast = day < TODAY && !isToday;

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={isPast}
                  onClick={() => {
                    onSelectDate(day);
                    setVisibleMonth(new Date(day.getFullYear(), day.getMonth(), 1));
                    setIsOpen(false);
                  }}
                  title={getHolidayName(day)}
                  className={[
                    "flex h-7 items-center justify-center rounded-md text-xs font-extrabold transition",
                    isPast
                      ? "cursor-not-allowed text-[#d1d5db] line-through"
                      : isSelected
                        ? "bg-[#0f62fe] text-white"
                        : isToday
                          ? "border border-[#0f62fe] text-[#0f62fe]"
                          : !isCurrentMonth
                            ? "text-[#c0c7d4]"
                            : isHoliday || isSunday
                              ? "text-[#ef4444] hover:bg-[#fff1f2]"
                              : isSaturday
                                ? "text-[#0f62fe] hover:bg-[#edf5ff]"
                                : "text-[#20283a] hover:bg-[#f3f6fb]",
                  ].join(" ")}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-0 text-xs font-extrabold text-[#1d2a57]">
      <span className="mb-1 block">{label}</span>
      <span className="relative block min-w-0">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-full appearance-none rounded-lg border border-[#dfe6f1] bg-white px-3 pr-8 text-xs font-bold text-[#1d2a57] outline-none focus:border-[#0f62fe]"
        >
          <option value="">선택</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2 h-4 w-4 text-[#53617c]" />
      </span>
    </label>
  );
}
