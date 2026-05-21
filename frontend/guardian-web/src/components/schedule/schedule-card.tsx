import ActionButton from "../common/action-button";
import ListItemCard from "../common/list-item-card";
import type { ScheduleFilter, ScheduleListItem } from "../../types/schedule";
import {
  canManageSchedule,
  formatScheduleTimeRange,
  getProfileImage,
  scheduleStatusLabel,
} from "./schedule-utils";

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

  const isPastConfirmed =
    schedule.status === "CONFIRMED" &&
    new Date(schedule.confirmed_time) <= new Date();

  const isInactive =
    selectedFilter === "all" &&
    (schedule.status === "COMPLETED" || schedule.status === "CANCELLED" || isPastConfirmed);

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

export default ScheduleCard;