import type { DashboardScheduleItem } from "../../api/dashboardApi";
import { Button } from "../common/Button";
import { Panel } from "../common/Panel";
import {
  CalendarMiniIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClinicRoomIcon,
  FilterIcon,
} from "./DashboardIcons";
import { timelineHours, visitTypeStyle } from "../../utils/dashboardUtils";

interface DashboardSchedulePanelProps {
  schedulesByHour: Record<string, DashboardScheduleItem[]>;
  isLoading: boolean;
  errorMessage: string;
  onToday: () => void;
  onPrevDate: () => void;
  onNextDate: () => void;
}

export function DashboardSchedulePanel({
  schedulesByHour,
  isLoading,
  errorMessage,
  onToday,
  onPrevDate,
  onNextDate,
}: DashboardSchedulePanelProps) {
  return (
    <Panel>
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
          <Button variant="secondary" size="sm" onClick={onToday}>
            오늘
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={onPrevDate}
            aria-label="이전 날짜"
          >
            <ChevronLeftIcon />
          </Button>
          <Button variant="secondary" size="icon" aria-label="날짜 선택">
            <CalendarMiniIcon />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={onNextDate}
            aria-label="다음 날짜"
          >
            <ChevronRightIcon />
          </Button>
          <Button variant="secondary" size="sm">
            <FilterIcon />
            필터
          </Button>
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
          const isLunchTime = hour === "12:00";

          return (
            <div key={hour} className="grid grid-cols-[58px_1fr] gap-3">
              <div className="pt-2.5 text-xs font-extrabold tabular-nums text-[#556179]">
                {hour}
              </div>
              <div className="pb-1.5">
                {isLunchTime ? (
                  <div className="flex h-10 items-center rounded-lg bg-[#f0f2f5] px-4 text-xs font-extrabold text-[#3f4757]">
                    12:00 - 13:00
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
    </Panel>
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
