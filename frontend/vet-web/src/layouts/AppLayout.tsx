import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Clock3,
  Home,
  Hospital,
  Settings,
  UsersRound,
} from "lucide-react";
import { AuthSession } from "../api/authApi";
import medipawSymbol from "../../../shared/assets/logo/medipaw-symbol.png";

export type AppMenuId = "home" | "emr" | "reservation" | "patients" | "settings";

interface AppLayoutProps {
  children: ReactNode;
  session: AuthSession;
  activeMenu?: AppMenuId;
  serviceName?: string;
  notificationCount?: number;
  onLogout: () => void;
  onNavigate?: (menuId: AppMenuId) => void;
}

const navigationItems: Array<{
  id: AppMenuId;
  label: string;
  Icon: typeof Home;
}> = [
  { id: "home", label: "홈", Icon: Home },
  { id: "emr", label: "EMR", Icon: ClipboardList },
  { id: "reservation", label: "예약 관리", Icon: CalendarDays },
  { id: "patients", label: "환자 관리", Icon: UsersRound },
  { id: "settings", label: "설정", Icon: Settings },
];

const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];

function formatClock(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const weekday = dayLabels[date.getDay()];
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");

  return `${year}.${month}.${day} (${weekday}) ${hour}:${minute}:${second}`;
}

function formatDateTime(value?: string) {
  if (!value) {
    return "기록 없음";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "기록 없음";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}.${month}.${day} ${hour}:${minute}`;
}

export default function AppLayout({
  children,
  session,
  activeMenu = "home",
  serviceName = "동물병원 의료 보조 시스템",
  notificationCount = 0,
  onLogout,
  onNavigate,
}: AppLayoutProps) {
  const [now, setNow] = useState(() => new Date());
  const [isHospitalMenuOpen, setIsHospitalMenuOpen] = useState(false);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, []);

  const clockText = useMemo(() => formatClock(now), [now]);
  const hospitalName = session.user.hospitalName || "medipaw 동물병원";
  const lastLoginText = useMemo(
    () => formatDateTime(session.lastLoginAt),
    [session.lastLoginAt]
  );

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-[#1f2937]">
      <header className="fixed inset-x-0 top-0 z-30 flex h-[72px] items-center justify-between border-b border-[#e5eaf2] bg-white px-6">
        <div className="flex flex-col items-start justify-center">
          <PawLogo />
          <p className="mt-1 pl-1 text-xs font-extrabold tracking-normal text-[#4b5563]">
            {serviceName}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="hidden items-center gap-2 text-sm font-bold tabular-nums text-[#3f4960] md:flex">
            <Clock3 className="h-5 w-5 text-[#6b7895]" strokeWidth={2.1} />
            <span>{clockText}</span>
          </div>

          <a
            href="#notifications"
            aria-label="알림 센터"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border-l border-r border-[#eef1f6] text-[#4b5877] transition hover:bg-[#f3f7ff] hover:text-[#4a89ff]"
          >
            <Bell className="h-5 w-5" strokeWidth={2.1} />
            {notificationCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-extrabold leading-none text-white">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </a>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsHospitalMenuOpen((isOpen) => !isOpen)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-extrabold text-[#20283a] transition hover:bg-[#f3f7ff]"
              aria-expanded={isHospitalMenuOpen}
            >
              <span>{hospitalName}</span>
              <ChevronDown className="h-4 w-4 text-[#6b7895]" strokeWidth={2.2} />
            </button>

            {isHospitalMenuOpen && (
              <div className="absolute right-0 top-12 w-48 rounded-lg border border-[#dfe5ef] bg-white py-2 shadow-lg">
                <button
                  type="button"
                  className="block w-full px-4 py-2 text-left text-sm font-bold text-[#344055] hover:bg-[#f4f7fb]"
                >
                  병원 설정
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="block w-full px-4 py-2 text-left text-sm font-bold text-[#344055] hover:bg-[#f4f7fb]"
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex pt-[72px]">
        <aside className="fixed bottom-0 left-0 top-[72px] z-20 flex w-56 flex-col justify-between border-r border-[#e5eaf2] bg-white px-4 py-5">
          <nav className="space-y-2" aria-label="주요 메뉴">
            {navigationItems.map(({ id, label, Icon }) => {
              const isActive = id === activeMenu;

              return (
                <button
                  type="button"
                  key={id}
                  onClick={() => onNavigate?.(id)}
                  className={[
                    "flex h-11 w-full items-center gap-3 rounded-lg px-4 text-left text-sm font-extrabold transition",
                    isActive
                      ? "bg-[#edf5ff] text-[#2f7df6]"
                      : "text-[#20283a] hover:bg-[#f7f9fc] hover:text-[#2f7df6]",
                  ].join(" ")}
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={2.2} />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>

          <section className="rounded-lg border border-[#e5eaf2] bg-white p-4 shadow-sm">
            <div className="flex items-start gap-2.5">
              <Hospital className="mt-0.5 h-5 w-5 shrink-0 text-[#4a89ff]" strokeWidth={2.1} />
              <div>
                <p className="text-sm font-extrabold text-[#20283a]">
                  {hospitalName}
                </p>
                <p className="mt-2 text-[11px] font-semibold leading-5 text-[#778196]">
                  서울특별시 강남구 테헤란로 123
                </p>
                <p className="mt-1 text-[11px] font-semibold text-[#778196]">
                  02-1234-5678
                </p>
              </div>
            </div>
            <div className="mt-4 border-t border-[#edf1f6] pt-3">
              <p className="text-xs font-bold text-[#4c5870]">수의사 계정</p>
              <p className="mt-1 text-sm font-extrabold text-[#20283a]">
                {session.user.name}
              </p>
            </div>
            <div className="mt-3 border-t border-[#edf1f6] pt-3">
              <p className="text-xs font-bold text-[#4c5870]">마지막 로그인</p>
              <p className="mt-1 text-sm font-extrabold tabular-nums text-[#20283a]">
                {lastLoginText}
              </p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="mt-4 h-10 w-full rounded-lg border border-[#dfe5ef] bg-white text-sm font-extrabold text-[#59657a] transition hover:border-[#4a89ff] hover:text-[#2f7df6]"
            >
              로그아웃
            </button>
          </section>
        </aside>

        <main className="ml-56 min-h-[calc(100vh-72px)] flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

function PawLogo() {
  return (
    <img
      src={medipawSymbol}
      alt="Medipaw"
      className="h-9 w-auto object-contain"
    />
  );
}
