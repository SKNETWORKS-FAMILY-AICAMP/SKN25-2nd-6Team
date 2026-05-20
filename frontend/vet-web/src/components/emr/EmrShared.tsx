import type { ReactNode } from "react";
import type { TriageStatus } from "../../pages/emr/emrMockData";
import { statusStyle } from "../../utils/emrUtils";

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-[#e4e9f1] bg-white shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

export function StatusBadge({ status }: { status: TriageStatus }) {
  const statusInfo = statusStyle[status];

  return (
    <span
      className={`inline-flex h-5 items-center rounded-md border px-2 text-[11px] font-extrabold ${statusInfo.className}`}
    >
      {statusInfo.label}
    </span>
  );
}
