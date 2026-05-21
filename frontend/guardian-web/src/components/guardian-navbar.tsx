import { Link, NavLink, useNavigate } from "react-router-dom";

import { useAuthStore } from "../stores/auth-store";
import medipawSymbol from "../../../shared/assets/logo/medipaw-symbol.png";

const navItems = [
  { label: "홈", to: "/home" },
  { label: "예약 내역", to: "/reservations" },
  { label: "챗봇 상담", to: "/chatbot" },
  { label: "마이페이지", to: "/mypage" },
];

interface GuardianNavbarProps {
  contentClassName?: string;
}

const GuardianNavbar = ({
  contentClassName = "max-w-[1280px] px-8",
}: GuardianNavbarProps) => {
  const navigate = useNavigate();
  const guardian = useAuthStore((state) => state.guardian);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const displayName = guardian?.name || guardian?.loginid || "보호자";

  const handleLogout = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div
        className={[
          "mx-auto flex h-16 items-center justify-between",
          contentClassName,
        ].join(" ")}
      >
        <Link to="/home" className="flex items-center">
          <img src={medipawSymbol} alt="MediPaw" className="h-9 w-auto" />
        </Link>

        <nav className="hidden h-full items-center gap-8 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "flex h-full items-center border-b-2 px-1 text-sm font-bold transition",
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-700 hover:text-blue-600",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full px-2 py-1 transition hover:bg-slate-50">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-blue-600">
              {displayName.slice(0, 1)}
            </span>
            <span className="hidden max-w-24 truncate text-sm font-bold text-slate-700 sm:block">
              {displayName}님
            </span>
            <span className="text-xs text-slate-400">v</span>
          </summary>
          <div className="absolute right-0 mt-2 w-40 rounded-2xl border border-slate-100 bg-white p-2 text-sm font-semibold shadow-xl shadow-slate-200/80">
            <Link
              to="/mypage"
              className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-600"
            >
              계정 관리
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="block w-full rounded-xl px-3 py-2 text-left text-slate-700 hover:bg-blue-50 hover:text-blue-600"
            >
              로그아웃
            </button>
          </div>
        </details>
      </div>
    </header>
  );
};

export default GuardianNavbar;
