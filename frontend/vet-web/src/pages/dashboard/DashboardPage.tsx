import { useEffect, useMemo, useState } from "react";
import {
  getDashboardApiErrorMessage,
  getDashboardApiErrorStatus,
  getTodayDashboard,
} from "../../api/dashboardApi";
import type {
  DashboardScheduleItem,
  DashboardSummaries,
  VisitType,
} from "../../api/dashboardApi";
import type { AuthSession } from "../../api/authApi";
import AppLayout, { type AppMenuId } from "../../layouts/AppLayout";

interface DashboardPageProps {
  session: AuthSession;
  onLogout: () => void;
  onNavigate: (menuId: AppMenuId) => void;
}

type SummaryToneKey = "blue" | "orange" | "red" | "green";

interface SummaryViewModel {
  id: keyof DashboardSummaries;
  label: string;
  value: number;
  tone: SummaryToneKey;
}

const timelineHours = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];

const summaryToneStyle: Record<
  SummaryToneKey,
  { wrapper: string; value: string }
> = {
  blue: {
    wrapper: "bg-[#eef4ff]",
    value: "text-[#4a6cff]",
  },
  orange: {
    wrapper: "bg-[#fff8e8]",
    value: "text-[#e97700]",
  },
  red: {
    wrapper: "bg-[#ffe8eb]",
    value: "text-[#ef3333]",
  },
  green: {
    wrapper: "bg-[#ecf9f1]",
    value: "text-[#16a34a]",
  },
};

const visitTypeStyle: Record<
  VisitType,
  { label: string; badge: string; dot: string }
> = {
  emergency: {
    label: "응급",
    badge: "border-[#ffccd6] bg-[#fff6f8] text-[#ef3b55]",
    dot: "bg-[#ef3b55]",
  },
  semiEmergency: {
    label: "준응급",
    badge: "border-[#ffdba7] bg-[#fff8ed] text-[#f28c18]",
    dot: "bg-[#f28c18]",
  },
  normal: {
    label: "일반",
    badge: "border-[#bfe8d0] bg-[#f1fbf5] text-[#269b54]",
    dot: "bg-[#27a65b]",
  },
  checkup: {
    label: "검진/일반예약",
    badge: "border-[#d8dde6] bg-[#f4f6f9] text-[#667085]",
    dot: "bg-[#98a2b3]",
  },
};

const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];

function formatSelectedDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}.${month}.${day} (${dayLabels[date.getDay()]})`;
}

function formatApiDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

export default function DashboardPage({
  session,
  onLogout,
  onNavigate,
}: DashboardPageProps) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [summaries, setSummaries] = useState<DashboardSummaries>({
    total: 0,
    waiting: 0,
    emergency: 0,
    completed: 0,
  });
  const [scheduleItems, setScheduleItems] = useState<DashboardScheduleItem[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const formattedDate = useMemo(
    () => formatSelectedDate(selectedDate),
    [selectedDate]
  );
  const apiDate = useMemo(() => formatApiDate(selectedDate), [selectedDate]);

  const schedulesByHour = useMemo(() => {
    return scheduleItems.reduce<Record<string, DashboardScheduleItem[]>>(
      (acc, item) => {
        const [hour] = item.start.split(":");
        const hourKey = `${hour}:00`;

        acc[hourKey] = [...(acc[hourKey] ?? []), item];
        return acc;
      },
      {}
    );
  }, [scheduleItems]);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setErrorMessage("");

    getTodayDashboard(session.accessToken, apiDate)
      .then((result) => {
        if (cancelled) return;
        setSummaries(result.summaries);
        setScheduleItems(result.schedules);
      })
      .catch((err) => {
        console.error("[dashboard] load failed", err);
        if (!cancelled) {
          const status = getDashboardApiErrorStatus(err);

          setSummaries({
            total: 0,
            waiting: 0,
            emergency: 0,
            completed: 0,
          });
          setScheduleItems([]);
          setErrorMessage(getDashboardApiErrorMessage(err));

          if (status === 401) {
            onLogout();
          }
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session.accessToken, apiDate, onLogout]);

  const summaryCards: SummaryViewModel[] = [
    { id: "total", label: "전체 예약", value: summaries.total, tone: "blue" },
    { id: "waiting", label: "대기 중", value: summaries.waiting, tone: "orange" },
    { id: "emergency", label: "응급", value: summaries.emergency, tone: "red" },
    { id: "completed", label: "진료 완료", value: summaries.completed, tone: "green" },
  ];

  return (
    <AppLayout
      session={session}
      activeMenu="home"
      onLogout={onLogout}
      onNavigate={onNavigate}
    >
      <div className="min-h-[calc(100vh-72px)] bg-[#f6f8fb] px-5 py-4">
        <div className="max-w-[1040px]">
          <section className="mb-4 flex items-center gap-5">
            <div className="min-w-[180px]">
              <h1 className="text-2xl font-extrabold tracking-normal text-[#151b28]">
                오늘의 진료 현황
              </h1>
              <p className="mt-2 text-sm font-bold tabular-nums text-[#6b7486]">
                {formattedDate}
              </p>
            </div>

            <div className="grid max-w-[780px] flex-1 grid-cols-4 gap-3">
              {summaryCards.map((summary) => (
                <SummaryCard key={summary.id} summary={summary} />
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[#e4e9f1] bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-[#edf1f6] px-5 py-3">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-extrabold tracking-normal text-[#151b28]">
                  오늘의 일정
                </h2>
                <div className="hidden items-center gap-2 text-sm font-extrabold text-[#4d5874] lg:flex">
                  <ClinicRoomIcon />
                  <span>진료실 1</span>
                  <span className="text-xs font-bold text-[#758197]">
                    수의사: 김보호
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDate(new Date())}
                  className="h-9 rounded-lg border border-[#dfe6f1] bg-white px-3 text-sm font-extrabold text-[#4d5874] transition hover:border-[#4a89ff] hover:text-[#2f7df6]"
                >
                  오늘
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate((date) => addDays(date, -1))}
                  aria-label="이전 날짜"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#dfe6f1] bg-white text-[#4d5874] transition hover:border-[#4a89ff] hover:text-[#2f7df6]"
                >
                  <ChevronLeftIcon />
                </button>
                <button
                  type="button"
                  aria-label="날짜 선택"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#dfe6f1] bg-white text-[#4d5874] transition hover:border-[#4a89ff] hover:text-[#2f7df6]"
                >
                  <CalendarMiniIcon />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate((date) => addDays(date, 1))}
                  aria-label="다음 날짜"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#dfe6f1] bg-white text-[#4d5874] transition hover:border-[#4a89ff] hover:text-[#2f7df6]"
                >
                  <ChevronRightIcon />
                </button>
                <button
                  type="button"
                  className="flex h-9 items-center gap-2 rounded-lg border border-[#dfe6f1] bg-white px-3 text-sm font-extrabold text-[#59657a] transition hover:border-[#4a89ff] hover:text-[#2f7df6]"
                >
                  <FilterIcon />
                  필터
                </button>
              </div>
            </div>

            <div className="px-5 py-3">
              {errorMessage ? (
                <div className="mb-3 rounded-lg border border-[#ffd5dc] bg-[#fff7f8] px-4 py-3 text-sm font-bold text-[#c9283e]">
                  {errorMessage}
                </div>
              ) : null}

              {isLoading ? (
                <div className="mb-3 rounded-lg border border-[#edf1f6] bg-[#f8fafc] px-4 py-3 text-sm font-bold text-[#657188]">
                  일정을 불러오는 중입니다.
                </div>
              ) : null}

              {timelineHours.map((hour) => {
                const items = schedulesByHour[hour] ?? [];
                const isLunchTime = hour === "13:00";

                return (
                  <div key={hour} className="grid grid-cols-[58px_1fr] gap-3">
                    <div className="pt-2.5 text-xs font-extrabold tabular-nums text-[#556179]">
                      {hour}
                    </div>
                    <div className="pb-1.5">
                      {isLunchTime ? (
                        <div className="flex h-10 items-center rounded-lg bg-[#f0f2f5] px-4 text-xs font-extrabold text-[#3f4757]">
                          13:00 - 14:00
                          <span className="ml-5">점심시간</span>
                        </div>
                      ) : items.length > 0 ? (
                        <div className="space-y-1.5">
                          {items.map((item) => (
                            <ScheduleRow key={item.id} item={item} />
                          ))}
                        </div>
                      ) : (
                        <div className="h-10 rounded-lg border border-[#edf1f6] bg-white" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-[#edf1f6] px-5 py-3">
              {Object.entries(visitTypeStyle).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center gap-2 text-xs font-bold text-[#59657a]"
                >
                  <span className={`h-3 w-3 rounded-full ${value.dot}`} />
                  {value.label}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

function SummaryCard({ summary }: { summary: SummaryViewModel }) {
  const tone = summaryToneStyle[summary.tone];

  return (
    <article className={`rounded-lg px-5 py-3.5 ${tone.wrapper}`}>
      <p className={`text-2xl font-extrabold tabular-nums ${tone.value}`}>
        {summary.value}
      </p>
      <p className="mt-1.5 text-xs font-extrabold text-[#717b8d]">
        {summary.label}
      </p>
    </article>
  );
}

function ScheduleRow({ item }: { item: DashboardScheduleItem }) {
  const type = visitTypeStyle[item.type];

  return (
    <article className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-[#e8edf4] bg-white px-4 py-2 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
      <div className="grid min-w-0 flex-1 grid-cols-[96px_minmax(150px,220px)_1fr] items-center gap-4">
        <p className="text-xs font-extrabold tabular-nums text-[#556179]">
          {item.start} - {item.end}
        </p>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-[#222b3c]">
            {item.patientName} ({item.species})
          </p>
        </div>
        <p className="truncate text-xs font-bold text-[#657188]">
          {item.breed} · {item.age} · {item.weight} · {item.reason}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-extrabold ${type.badge}`}
      >
        {type.label}
      </span>
    </article>
  );
}

function IconBase({ children }: { children: React.ReactNode }) {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <IconBase>
      <path d="m15 18-6-6 6-6" />
    </IconBase>
  );
}

function ChevronRightIcon() {
  return (
    <IconBase>
      <path d="m9 18 6-6-6-6" />
    </IconBase>
  );
}

function CalendarMiniIcon() {
  return (
    <IconBase>
      <path d="M7 3v4" />
      <path d="M17 3v4" />
      <path d="M4 8h16" />
      <path d="M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" />
    </IconBase>
  );
}

function FilterIcon() {
  return (
    <IconBase>
      <path d="M4 5h16" />
      <path d="M7 12h10" />
      <path d="M10 19h4" />
    </IconBase>
  );
}

function ClinicRoomIcon() {
  return (
    <IconBase>
      <path d="M5 21V8l7-5 7 5v13" />
      <path d="M9 21v-6h6v6" />
      <path d="M10 10h4" />
      <path d="M12 8v4" />
    </IconBase>
  );
}
