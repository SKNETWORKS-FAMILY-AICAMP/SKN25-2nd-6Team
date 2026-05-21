import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { useNavigate } from "react-router-dom";

import {
  cancelSchedule,
  getAvailableScheduleSlots,
  getSchedules,
  updateSchedule,
} from "../../api/schedule-api";
import ActionButton from "../../components/common/action-button";
import ListItemCard from "../../components/common/list-item-card";
import PageHeader from "../../components/common/page-header";
import GuardianLayout from "../../layouts/guardian-layout";
import type {
  ApiErrorResponse,
  AvailableScheduleSlot,
  ScheduleFilter,
  ScheduleListItem,
  ScheduleStatus,
} from "../../types/schedule";

const pageSize = 10;
const kstOffset = "+09:00";
const defaultProfileImages = [
  "/assets/profile1.png",
  "/assets/profile2.png",
  "/assets/profile3.png",
  "/assets/profile4.png",
  "/assets/profile5.png",
  "/assets/profile6.png",
];

const scheduleTabs: Array<{ filter: ScheduleFilter; label: string }> = [
  { filter: "all", label: "전체" },
  { filter: "upcoming", label: "예정된 예약" },
  { filter: "past", label: "지난 예약" },
  { filter: "cancelled", label: "취소된 예약" },
];

const scheduleStatusLabel: Record<ScheduleStatus, string> = {
  PENDING: "예약 대기",
  CONFIRMED: "예약 확정",
  COMPLETED: "진료 완료",
  CANCELLED: "예약 취소",
};

const getErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (isAxiosError<ApiErrorResponse | string>(error)) {
    const responseData = error.response?.data;

    if (typeof responseData === "string") {
      try {
        return (
          (JSON.parse(responseData) as ApiErrorResponse).message ||
          fallbackMessage
        );
      } catch {
        return fallbackMessage;
      }
    }

    return responseData?.message || fallbackMessage;
  }

  return fallbackMessage;
};

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatScheduleDateTime = (isoDate: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoDate));

const formatScheduleTimeRange = (startTime: string, endTime: string) => {
  const start = new Date(startTime);
  const end = new Date(endTime);

  return `${formatScheduleDateTime(startTime)} - ${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
};

const getProfileImage = (schedule: ScheduleListItem) =>
  schedule.pet_profile_image ||
  defaultProfileImages[Math.abs(schedule.pet_id) % defaultProfileImages.length];


  const canManageSchedule = (schedule: ScheduleListItem) =>
  schedule.status === "CONFIRMED" &&
  new Date(schedule.confirmed_time).getTime() > Date.now();

const buildKstDateTime = (date: string, time: string) =>
  `${date}T${time}:00${kstOffset}`;

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
    <path
      d="M7 3v4M17 3v4M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

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

const ScheduleSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 3 }).map((_, index) => (
      <ListItemCard
        key={index}
        className="grid animate-pulse grid-cols-[76px_1fr_200px_150px] items-center gap-6"
      >
        <div className="h-16 w-16 rounded-full bg-slate-100" />
        <div className="space-y-3">
          <div className="h-4 w-40 rounded bg-slate-100" />
          <div className="h-5 w-24 rounded bg-slate-100" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-32 rounded bg-slate-100" />
          <div className="h-4 w-44 rounded bg-slate-100" />
        </div>
        <div className="space-y-3">
          <div className="h-7 w-20 rounded-full bg-slate-100" />
          <div className="h-9 w-32 rounded bg-slate-100" />
        </div>
      </ListItemCard>
    ))}
  </div>
);

interface ScheduleCardProps {
  schedule: ScheduleListItem;
  selectedFilter: ScheduleFilter;
  onOpenChange: (schedule: ScheduleListItem) => void;
  onOpenCancel: (schedule: ScheduleListItem) => void;
}
const ScheduleCard = ({
  schedule,
  selectedFilter,
  onOpenChange,
  onOpenCancel,
}: ScheduleCardProps) => {
  const canManage = canManageSchedule(schedule);

const isInactive =
  selectedFilter === "all" &&
  (schedule.status === "COMPLETED" || schedule.status === "CANCELLED");

  const badgeClassName =
    schedule.status === "CONFIRMED"
      ? "bg-blue-100 text-blue-600 ring-blue-200"
      : schedule.status === "CANCELLED"
        ? "bg-rose-100 text-rose-500 ring-rose-100"
        : "bg-slate-100 text-slate-500 ring-slate-200";

  return (
    <ListItemCard
      className={[
        "grid gap-4 transition hover:border-blue-100 hover:shadow-lg hover:shadow-blue-100/50",
        "lg:grid-cols-[72px_1fr_auto] lg:items-center lg:gap-6",
        isInactive ? "opacity-45 grayscale" : "",
      ].join(" ")}
    >
      <div className="h-16 w-16 overflow-hidden rounded-2xl bg-slate-100">
        <img
          src={getProfileImage(schedule)}
          alt={`${schedule.pet_name} 프로필`}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-black text-slate-950">
            {schedule.pet_name}
          </h2>

          <span
            className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-bold ring-1 ${badgeClassName}`}
          >
            {scheduleStatusLabel[schedule.status]}
          </span>
        </div>

        <p className="mt-2 text-base font-black text-slate-900">
          {schedule.category}
        </p>

        <p className="mt-1.5 text-sm font-bold text-blue-600">
          {formatScheduleTimeRange(
            schedule.confirmed_time,
            schedule.confirmed_end_time,
          )}
        </p>
      </div>

      {canManage ? (
        <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
          <ActionButton
            type="button"
            onClick={() => onOpenChange(schedule)}
            variant="outlineBlue"
            size="sm"
            className="min-w-[96px] whitespace-nowrap rounded-lg"
          >
            예약 변경
          </ActionButton>

          <ActionButton
            type="button"
            onClick={() => onOpenCancel(schedule)}
            variant="outlineDanger"
            size="sm"
            className="min-w-[96px] whitespace-nowrap rounded-lg"
          >
            예약 취소
          </ActionButton>
        </div>
      ) : null}
    </ListItemCard>
  );
};

interface ChangeScheduleModalProps {
  schedule: ScheduleListItem;
  onClose: () => void;
  onChanged: () => void;
}

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

        if (!isMounted) {
          return;
        }

        if (response.code !== 200) {
          setErrorMessage(
            response.message || "예약 가능 시간을 불러오지 못했습니다.",
          );
          setSlots([]);
          return;
        }

        setSlots(response.result);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          getErrorMessage(error, "예약 가능 시간을 불러오지 못했습니다."),
        );
        setSlots([]);
      } finally {
        if (isMounted) {
          setIsLoadingSlots(false);
        }
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
    if (!selectedSlot) {
      return;
    }

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
            현재 예약: {formatScheduleTimeRange(schedule.confirmed_time, schedule.confirmed_end_time)}
            <span className="ml-3 text-blue-500">담당 {schedule.doctor_name}</span>
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
                    const isSelected = selectedSlot?.start_time === slot.start_time;

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

interface CancelScheduleModalProps {
  schedule: ScheduleListItem;
  onClose: () => void;
  onCancelled: () => void;
}

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
            className="h-12 rounded-xl border border-slate-200 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            아니요
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="h-12 rounded-xl bg-rose-500 text-sm font-black text-white shadow-lg shadow-rose-100 transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {isSubmitting ? "취소 중" : "네, 취소할게요"}
          </button>
        </div>
      </section>
    </div>
  );
};

const ScheduleListPage = () => {
  const navigate = useNavigate();
  const [selectedFilter, setSelectedFilter] = useState<ScheduleFilter>("all");
  const [schedules, setSchedules] = useState<ScheduleListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [changeTarget, setChangeTarget] = useState<ScheduleListItem | null>(
    null,
  );
  const [cancelTarget, setCancelTarget] = useState<ScheduleListItem | null>(
    null,
  );

  const visibleSchedules = useMemo(
    () => schedules.filter((schedule) => schedule.status !== "PENDING"),
    [schedules],
  );

  const loadSchedules = async ({
    filter,
    targetPage,
    append,
  }: {
    filter: ScheduleFilter;
    targetPage: number;
    append: boolean;
  }) => {
    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage("");

      const response = await getSchedules({
        filter,
        page: targetPage,
        size: pageSize,
      });

      if (response.code !== 200) {
        setErrorMessage(response.message || "예약 목록을 불러오지 못했습니다.");
        if (!append) {
          setSchedules([]);
        }
        return;
      }

      const filteredItems = response.result.items.filter(
        (schedule) => schedule.status !== "PENDING",
      );
      setSchedules((currentSchedules) =>
        append ? [...currentSchedules, ...filteredItems] : filteredItems,
      );
      setPage(response.result.page);
      setHasNext(response.result.has_next);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "예약 목록을 불러오지 못했습니다."));
      if (!append) {
        setSchedules([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    loadSchedules({
      filter: selectedFilter,
      targetPage: 1,
      append: false,
    });
  }, [selectedFilter]);

  const handleSelectFilter = (filter: ScheduleFilter) => {
    if (filter === selectedFilter) {
      return;
    }

    setSelectedFilter(filter);
    setPage(1);
    setHasNext(false);
    setSchedules([]);
  };

  const handleLoadMore = () => {
    if (isLoadingMore || !hasNext) {
      return;
    }

    loadSchedules({
      filter: selectedFilter,
      targetPage: page + 1,
      append: true,
    });
  };

  const handleRefreshAfterMutation = () => {
    setChangeTarget(null);
    setCancelTarget(null);
    loadSchedules({
      filter: selectedFilter,
      targetPage: 1,
      append: false,
    });
  };

  return (
    <GuardianLayout>
      <PageHeader
        title="예약 내역"
        description="예정된 예약과 지난 예약을 확인할 수 있습니다."
      />

        <section className="rounded-2xl border border-slate-100 bg-white px-5 shadow-sm">
          <div className="flex gap-8 border-b border-slate-100">
            {scheduleTabs.map((tab) => (
              <button
                key={tab.filter}
                type="button"
                onClick={() => handleSelectFilter(tab.filter)}
                className={[
                  "h-14 border-b-2 px-1 text-sm font-black transition",
                  selectedFilter === tab.filter
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-blue-600",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="py-5">
            {errorMessage ? (
              <div className="mb-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">
                {errorMessage}
              </div>
            ) : null}

            {isLoading ? (
              <ScheduleSkeleton />
            ) : visibleSchedules.length === 0 ? (
              <div className="flex min-h-[420px] items-center justify-center py-12 text-center">
                <div>
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
                    <CalendarIcon />
                  </div>
                  <h2 className="mt-6 text-xl font-black text-slate-950">
                    아직 예약된 진료가 없습니다.
                  </h2>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                    AI 챗봇 상담을 통해 간편하게 예약을 진행해보세요.
                  </p>
                  <ActionButton
                    type="button"
                    onClick={() => navigate("/chatbot")}
                    size="lg"
                    className="mt-7"
                  >
                    챗봇 상담 시작하기
                  </ActionButton>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleSchedules.map((schedule) => (
                  
                  <ScheduleCard
                    key={schedule.schedule_id} 
                    schedule={schedule}
                    selectedFilter={selectedFilter}
                    onOpenChange={setChangeTarget}
                    onOpenCancel={setCancelTarget}
                  />
                ))}
              </div>
            )}

            {!isLoading && hasNext ? (
              <div className="mt-6 flex justify-center">
                <ActionButton
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  variant="outlineBlue"
                  size="md"
                  className="px-7"
                >
                  {isLoadingMore ? "불러오는 중" : "더보기"}
                </ActionButton>
              </div>
            ) : null}
          </div>
        </section>
      {changeTarget ? (
        <ChangeScheduleModal
          schedule={changeTarget}
          onClose={() => setChangeTarget(null)}
          onChanged={handleRefreshAfterMutation}
        />
      ) : null}

      {cancelTarget ? (
        <CancelScheduleModal
          schedule={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onCancelled={handleRefreshAfterMutation}
        />
      ) : null}
    </GuardianLayout>
  );
};

export default ScheduleListPage;
