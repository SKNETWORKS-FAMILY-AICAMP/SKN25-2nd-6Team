import { AuthSession } from "../../api/authApi";

interface DashboardPageProps {
  session: AuthSession;
}

export default function DashboardPage({ session }: DashboardPageProps) {
  return (
    <main className="min-h-screen bg-[#f5f8ff] px-6 py-6 text-slate-900">
      <section className="mx-auto flex min-h-[calc(100vh-48px)] max-w-[1400px] items-center justify-center rounded-3xl border border-slate-200 bg-white px-12 py-10 shadow-sm">
        <div className="text-center">
          <p className="mb-3 text-sm font-bold text-blue-600">
            비밀번호 변경 완료
          </p>

          <h1 className="text-4xl font-bold text-slate-900">
            {session.user.hospitalName} 대시보드
          </h1>

          <p className="mt-5 text-base font-semibold text-slate-500">
            새 인증 토큰이 발급되었고, 이제 시스템 접근이 가능합니다.
          </p>
        </div>
      </section>
    </main>
  );
}
