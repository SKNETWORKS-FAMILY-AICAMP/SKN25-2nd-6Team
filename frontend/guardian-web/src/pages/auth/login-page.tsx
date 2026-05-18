import { ChangeEvent, FormEvent, useState } from "react";
import { isAxiosError } from "axios";
import { Link, useNavigate } from "react-router-dom";

import { loginGuardian } from "../../api/auth-api";
import { useAuthStore } from "../../stores/auth-store";

interface LoginFormState {
  loginid: string;
  password: string;
  remember: boolean;
}

interface LoginErrorResponse {
  code?: number;
  message?: string;
}

const serviceItems = [
  {
    icon: "AI",
    title: "AI 챗봇 상담",
    description: "반려동물 상태를 입력하면 필요한 상담 흐름을 안내합니다.",
  },
  {
    icon: "R",
    title: "병원 예약 및 관리",
    description: "상담 이후 필요한 병원 예약과 예약 내역을 관리할 수 있습니다.",
  },
  {
    icon: "C",
    title: "상담 후 예약 진행",
    description: "챗봇 상담 결과를 바탕으로 빠르게 예약 절차를 이어갑니다.",
  },
  {
    icon: "H",
    title: "상태 기록 및 경과 관리",
    description: "반려동물의 상태 변화와 상담 기록을 한곳에서 확인합니다.",
  },
];

const inputClassName = (hasError: boolean) =>
  [
    "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
      : "border-slate-200 focus:border-blue-500 focus:ring-blue-100",
  ].join(" ");

const isDevLoginEnabled =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_LOGIN === "true";

const devLoginCredentials = {
  loginid: "guardian-demo",
  password: "demo1234!",
};

const LoginPage = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [form, setForm] = useState<LoginFormState>({
    loginid: "",
    password: "",
    remember: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange =
    (field: keyof Omit<LoginFormState, "remember">) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
      setErrorMessage("");
    };

  const handleRememberChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({
      ...current,
      remember: event.target.checked,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.loginid.trim()) {
      setErrorMessage("로그인 ID를 입력해주세요.");
      return;
    }

    if (!form.password) {
      setErrorMessage("비밀번호를 입력해주세요.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      if (
        isDevLoginEnabled &&
        form.loginid.trim() === devLoginCredentials.loginid &&
        form.password === devLoginCredentials.password
      ) {
        setAuth({
          loginid: devLoginCredentials.loginid,
          name: "개발용 보호자",
          accessToken: "dev-access-token",
          refreshToken: "dev-refresh-token",
          remember: form.remember,
        });
        navigate("/home");
        return;
      }

      const response = await loginGuardian({
        loginid: form.loginid.trim(),
        password: form.password,
        keep_login: form.remember,
      });

      if (response.code !== 200 || !response.result) {
        setErrorMessage(response.message || "로그인에 실패했습니다.");
        return;
      }

      setAuth({
        loginid: form.loginid.trim(),
        accessToken: response.result.access_token,
        refreshToken: response.result.refresh_token,
        remember: form.remember,
      });
      navigate("/home");
    } catch (error) {
      if (isAxiosError<LoginErrorResponse>(error)) {
        setErrorMessage(
          error.response?.data?.message ||
            "네트워크 오류가 발생했습니다. 다시 시도해주세요.",
        );
        return;
      }

      setErrorMessage("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 text-slate-900">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/login" className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
            M
          </span>
          <div>
            <p className="text-base font-bold text-blue-700 sm:text-lg">MediPaw</p>
            <p className="hidden text-xs font-semibold text-slate-500 sm:block">
              보호자 반려동물 상담 및 예약 보조 서비스
            </p>
          </div>
        </Link>

        <Link
          to="/signup"
          className="rounded-xl border border-blue-500 px-4 py-2 text-sm font-bold text-blue-600 transition hover:bg-blue-50"
        >
          회원가입
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 pb-6 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <section className="space-y-5">
          <div>
            <p className="text-sm font-bold text-blue-600">MediPaw guardian service</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-950">
              MediPaw와 함께
              <br />
              우리 아이의 건강을 지켜주세요
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              AI 챗봇 상담으로 문제를 정리하고, 보호자의 더 쉬운 반려생활을
              도와드립니다.
            </p>
          </div>

          <div className="grid gap-3">
            {serviceItems.map((item) => (
              <article
                key={item.title}
                className="flex gap-4 rounded-2xl border border-blue-100 bg-white/80 p-4 shadow-sm shadow-blue-100/60"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white">
                  {item.icon}
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">{item.title}</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {item.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-xl shadow-blue-100/70 sm:p-6">
          <div className="mb-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl font-bold text-blue-600">
              M
            </div>
            <h2 className="mt-3 text-2xl font-bold text-slate-950">로그인</h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              MediPaw 계정으로 로그인해주세요.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-bold text-slate-800" htmlFor="loginid">
                ID
              </label>
              <input
                id="loginid"
                value={form.loginid}
                onChange={handleChange("loginid")}
                placeholder="ID를 입력해주세요."
                autoComplete="username"
                aria-invalid={Boolean(errorMessage && !form.loginid.trim())}
                className={inputClassName(Boolean(errorMessage && !form.loginid.trim()))}
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-800" htmlFor="password">
                비밀번호
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange("password")}
                  placeholder="비밀번호를 입력해주세요."
                  autoComplete="current-password"
                  aria-invalid={Boolean(errorMessage && !form.password)}
                  className={`${inputClassName(
                    Boolean(errorMessage && !form.password),
                  )} pr-20`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-blue-600"
                >
                  {showPassword ? "숨김" : "표시"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="flex items-center gap-2 font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={form.remember}
                  onChange={handleRememberChange}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                로그인 상태 유지
              </label>

              <div className="flex gap-3">
                <Link className="font-bold text-blue-600 hover:text-blue-700" to="/find-id">
                  아이디 찾기
                </Link>
                <Link
                  className="font-bold text-blue-600 hover:text-blue-700"
                  to="/find-password"
                >
                  비밀번호 찾기
                </Link>
              </div>
            </div>

            {errorMessage && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-600">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full rounded-xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isSubmitting ? "로그인 중..." : "로그인"}
            </button>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-bold text-slate-400">또는</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <Link
              to="/signup"
              className="flex h-11 w-full items-center justify-center rounded-xl border border-blue-500 text-sm font-bold text-blue-600 transition hover:bg-blue-50"
            >
              회원가입하기
            </Link>
          </form>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-5xl flex-col gap-2 border-t border-blue-100 px-4 py-4 text-xs font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>고객센터 02-123-4567 · support@medipaw.kr · 평일 09:00 - 18:00</p>
        <p>© 2024 MediPaw. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LoginPage;
