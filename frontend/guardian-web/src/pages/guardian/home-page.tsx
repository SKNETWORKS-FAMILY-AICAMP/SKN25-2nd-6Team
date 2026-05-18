import { Link } from "react-router-dom";

import { useAuthStore } from "../../stores/auth-store";

const HomePage = () => {
  const guardian = useAuthStore((state) => state.guardian);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return (
    <div className="min-h-screen bg-sky-50 px-4 py-6 text-slate-900">
      <main className="mx-auto max-w-4xl rounded-3xl border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/70">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-blue-600">MediPaw guardian home</p>
            <h1 className="mt-2 text-2xl font-black">
              {guardian?.name || guardian?.loginid || "보호자"}님, 환영합니다.
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              로그인 후 이동 확인을 위한 보호자 홈 화면입니다.
            </p>
          </div>

          <Link
            to="/login"
            onClick={clearAuth}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-blue-500 px-4 text-sm font-bold text-blue-600 transition hover:bg-blue-50"
          >
            로그아웃
          </Link>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
