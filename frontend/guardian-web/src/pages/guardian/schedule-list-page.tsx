import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getSchedules } from "../../api/schedule-api";
import ActionButton from "../../components/common/action-button";
import PageHeader from "../../components/common/page-header";
import CancelScheduleModal from "../../components/schedule/cancel-schedule-modal";
import ChangeScheduleModal from "../../components/schedule/change-schedule-modal";
import ScheduleCard from "../../components/schedule/schedule-card";
import ScheduleSkeleton from "../../components/schedule/schedule-skeleton";
import ScheduleTabs from "../../components/schedule/schedule-tabs";
import {
  getErrorMessage,
  pageSize,
} from "../../components/schedule/schedule-utils";
import GuardianLayout from "../../layouts/guardian-layout";
import type { ScheduleFilter, ScheduleListItem } from "../../types/schedule";

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

      <section className="rounded-2xl border border-slate-100 bg-white px-6 pb-6 shadow-sm">
        <ScheduleTabs
          selectedFilter={selectedFilter}
          onSelectFilter={handleSelectFilter}
        />

        <div className="py-6">
          {errorMessage ? (
            <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">
              {errorMessage}
            </div>
          ) : null}

          {isLoading ? (
            <ScheduleSkeleton />
          ) : visibleSchedules.length === 0 ? (
            <div className="flex min-h-[360px] items-center justify-center py-10 text-center">
              <div>
                <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
                  <CalendarIcon />
                </div>

                <h2 className="mt-5 text-xl font-black text-slate-950">
                  아직 예약된 진료가 없습니다.
                </h2>

                <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                  AI 챗봇 상담을 통해 간편하게 예약을 진행해보세요.
                </p>

                <ActionButton
                  type="button"
                  onClick={() => navigate("/chatbot")}
                  size="lg"
                  className="mt-6"
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