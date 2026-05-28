import type { ScheduleFilter } from "../../types/schedule";
import { scheduleTabs } from "./schedule-utils";

interface ScheduleTabsProps {
  selectedFilter: ScheduleFilter;
  onSelectFilter: (filter: ScheduleFilter) => void;
}

const ScheduleTabs = ({
  selectedFilter,
  onSelectFilter,
}: ScheduleTabsProps) => {
  return (
    <div className="flex gap-8 border-b border-slate-100">
      {scheduleTabs.map((tab) => (
        <button
          key={tab.filter}
          type="button"
          onClick={() => onSelectFilter(tab.filter)}
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
  );
};

export default ScheduleTabs;