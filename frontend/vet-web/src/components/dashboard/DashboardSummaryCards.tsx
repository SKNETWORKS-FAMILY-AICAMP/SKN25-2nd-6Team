import type { SummaryViewModel } from "../../utils/dashboardUtils";
import { summaryToneStyle } from "../../utils/dashboardUtils";

interface DashboardSummaryCardsProps {
  summaries: SummaryViewModel[];
}

export function DashboardSummaryCards({ summaries }: DashboardSummaryCardsProps) {
  return (
    <div className="grid max-w-[780px] flex-1 grid-cols-4 gap-3">
      {summaries.map((summary) => (
        <SummaryCard key={summary.id} summary={summary} />
      ))}
    </div>
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
