import type { TriageStatus } from "../pages/emr/emrMockData";

export const statusStyle: Record<TriageStatus, { label: string; className: string }> = {
  emergency: {
    label: "응급",
    className: "bg-[#fff1f2] text-[#ef4444] border-[#fecdd3]",
  },
  semiEmergency: {
    label: "준응급",
    className: "bg-[#fff7ed] text-[#f97316] border-[#fed7aa]",
  },
  normal: {
    label: "일반",
    className: "bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]",
  },
};
