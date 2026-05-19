import React, { useState } from "react";
import {
  CalendarDays,
  Eye,
  EyeOff,
  FileText,
  PawPrint,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import logo from "../../../../shared/assets/logo/medipaw-symbol.png";
import { AuthSession, loginDoctor } from "../../api/authApi";

interface LoginPageProps {
  onLoginSuccess: (session: AuthSession) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [keepLogin, setKeepLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      const session = await loginDoctor(id, password);
      onLoginSuccess(session);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "로그인 중 오류가 발생했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f8ff] px-6 py-6 text-slate-900">
      <section className="mx-auto flex min-h-[calc(100vh-48px)] max-w-[1400px] items-center justify-center rounded-3xl border border-slate-200 bg-white px-12 py-10 shadow-sm">
        <div className="grid w-full grid-cols-1 gap-14 lg:grid-cols-2">
          <section className="flex flex-col justify-center">
            <div className="mb-14">
              <img src={logo} alt="MediPaw" className="w-[380px]" />

              <p className="mt-3 pl-2 text-xl font-bold tracking-[0.1em] text-slate-500">
                동물병원 의료 보조 시스템
              </p>
            </div>

            <h1 className="mb-10 text-4xl font-bold leading-tight text-slate-900">
              AI 기반 스마트 병원 운영의 시작
              <br />
              MediPaw가 함께합니다.
            </h1>

            <div className="space-y-7">
              <FeatureItem
                icon={<PawPrint size={34} />}
                title="AI 사전 문진 & 응급 분류"
                description="보호자 사전 문진 데이터를 기반으로 AI가 응급도를 분류하여 진료를 지원합니다."
              />

              <FeatureItem
                icon={<CalendarDays size={34} />}
                title="예약 & 스케줄 관리"
                description="예약 현황을 한눈에 확인하고 효율적인 진료 스케줄을 관리합니다."
              />

              <FeatureItem
                icon={<FileText size={34} />}
                title="EMR 연동 & 환자 관리"
                description="진료 기록과 환자 정보를 통합 관리하여 업무 효율을 높여드립니다."
              />
            </div>
          </section>

          <section className="flex flex-col justify-center">
            <div className="mx-auto w-full max-w-[500px] rounded-3xl border border-slate-200 bg-white px-10 py-10 shadow-sm">
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-slate-900">
                  병원 관리자 로그인
                </h2>

                <p className="mt-4 text-sm font-medium text-slate-500">
                  MediPaw 시스템에 로그인하세요.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold leading-6 text-blue-700">
                  테스트 계정: admin / test1234!
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    아이디
                  </label>

                  <input
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="아이디를 입력하세요"
                    className="h-14 w-full rounded-xl border border-slate-200 px-4 text-sm font-medium outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    비밀번호
                  </label>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="비밀번호를 입력하세요"
                      className="h-14 w-full rounded-xl border border-slate-200 px-4 pr-12 text-sm font-medium outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100">
                      <TriangleAlert size={15} fill="currentColor" />
                    </div>

                    <p className="text-sm font-bold leading-6">{error}</p>
                  </div>
                )}

                <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-500">
                  <input
                    type="checkbox"
                    checked={keepLogin}
                    onChange={(e) => setKeepLogin(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  로그인 상태 유지
                </label>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="h-14 w-full rounded-xl bg-blue-600 text-base font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {isLoading ? "로그인 중..." : "로그인"}
                </button>
              </form>

              <div className="mt-6 flex items-center justify-center gap-5 text-sm font-bold text-blue-600">
                <button type="button">아이디 문의</button>
                <span className="text-slate-300">|</span>
                <button type="button">비밀번호 재설정</button>
              </div>
            </div>

            <div className="mx-auto mt-5 flex h-14 w-full max-w-[500px] items-center justify-center gap-3 rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
              <ShieldCheck size={18} />
              계정 관련 문의는 담당 관리자에게 문의해주세요.
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

interface FeatureItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureItem({ icon, title, description }: FeatureItemProps) {
  return (
    <div className="flex gap-5">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        {icon}
      </div>

      <div>
        <h3 className="mb-2 text-xl font-bold text-slate-900">{title}</h3>

        <p className="max-w-lg text-sm font-semibold leading-7 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}
