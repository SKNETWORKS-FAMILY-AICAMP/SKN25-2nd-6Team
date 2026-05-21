import type {
  DashboardScheduleItem,
  DashboardSummaries,
  VisitType,
} from "../api/dashboardApi";

export type SummaryToneKey = "blue" | "orange" | "red" | "green";

export interface SummaryViewModel {
  id: keyof DashboardSummaries;
  label: string;
  value: number;
  tone: SummaryToneKey;
}

// 30분 단위 타임라인 슬롯. 12:00 한 줄로 점심(12:00-13:00)을 표시하므로 12:30은 제외.
export const timelineHours = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
];

export const summaryToneStyle: Record<
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

export const visitTypeStyle: Record<
  VisitType,
  { label: string; badge: string; dot: string }
> = {
  emergency: {
    label: "응급",
    badge: "border-[#ffd0d9] bg-[#fff5f7] text-[#f23555]",
    dot: "bg-[#f23555]",
  },
  semiEmergency: {
    label: "준응급",
    badge: "border-[#ffdfb0] bg-[#fff8ec] text-[#f7931a]",
    dot: "bg-[#f7931a]",
  },
  normal: {
    label: "일반",
    badge: "border-[#bde8ce] bg-[#f1fbf5] text-[#2fb463]",
    dot: "bg-[#2fb463]",
  },
  checkup: {
    label: "검진/일반예약",
    badge: "border-[#d8dde6] bg-[#f5f7fa] text-[#6f7a8c]",
    dot: "bg-[#9aa4b3]",
  },
};

const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];

export function formatSelectedDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}.${month}.${day} (${dayLabels[date.getDay()]})`;
}

export function formatApiDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

export function createSummaryCards(
  summaries: DashboardSummaries
): SummaryViewModel[] {
  return [
    { id: "total", label: "전체 예약", value: summaries.total, tone: "blue" },
    { id: "waiting", label: "대기 중", value: summaries.waiting, tone: "orange" },
    { id: "emergency", label: "응급", value: summaries.emergency, tone: "red" },
    { id: "completed", label: "진료 완료", value: summaries.completed, tone: "green" },
  ];
}

export function groupSchedulesByHour(items: DashboardScheduleItem[]) {
  return items.reduce<Record<string, DashboardScheduleItem[]>>((acc, item) => {
    // 시작 시각을 30분 슬롯(:00 / :30)으로 내림하여 그룹핑
    const [hour, minute] = item.start.split(":");
    const slot = Number(minute) < 30 ? "00" : "30";
    const slotKey = `${hour.padStart(2, "0")}:${slot}`;

    acc[slotKey] = [...(acc[slotKey] ?? []), item];
    return acc;
  }, {});
}
