import { useEffect, useMemo, useState } from "react";
import {
  getDashboardApiErrorMessage,
  getDashboardApiErrorStatus,
  getTodayDashboard,
} from "../../api/dashboardApi";
import type {
  DashboardScheduleItem,
  DashboardSummaries,
} from "../../api/dashboardApi";
import type { AuthSession } from "../../api/authApi";
import { DashboardSchedulePanel } from "../../components/dashboard/DashboardSchedulePanel";
import { DashboardSummaryCards } from "../../components/dashboard/DashboardSummaryCards";
import AppLayout, { type AppMenuId } from "../../layouts/AppLayout";
import {
  addDays,
  createSummaryCards,
  formatApiDate,
  formatSelectedDate,
  groupSchedulesByHour,
} from "../../utils/dashboardUtils";

interface DashboardPageProps {
  session: AuthSession;
  onLogout: () => void;
  onNavigate: (menuId: AppMenuId) => void;
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
  const schedulesByHour = useMemo(
    () => groupSchedulesByHour(scheduleItems),
    [scheduleItems]
  );
  const summaryCards = useMemo(
    () => createSummaryCards(summaries),
    [summaries]
  );

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

            <DashboardSummaryCards summaries={summaryCards} />
          </section>

          <DashboardSchedulePanel
            schedulesByHour={schedulesByHour}
            isLoading={isLoading}
            errorMessage={errorMessage}
            onToday={() => setSelectedDate(new Date())}
            onPrevDate={() => setSelectedDate((date) => addDays(date, -1))}
            onNextDate={() => setSelectedDate((date) => addDays(date, 1))}
          />
        </div>
      </div>
    </AppLayout>
  );
}
