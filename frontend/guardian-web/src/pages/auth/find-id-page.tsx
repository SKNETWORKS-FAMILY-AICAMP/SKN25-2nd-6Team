import { ChangeEvent, FormEvent, useState } from "react";
import { isAxiosError } from "axios";
import { Link } from "react-router-dom";

import { findGuardianId } from "../../api/auth-api";

interface FindIdFormState {
  name: string;
  phone: string;
}

interface FindIdErrorResponse {
  code?: number;
  message?: string;
}

const initialFormState: FindIdFormState = {
  name: "",
  phone: "",
};

const inputClassName = (hasError: boolean) =>
  [
    "h-10 w-full rounded-xl border bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
      : "border-slate-200 focus:border-blue-500 focus:ring-blue-100",
  ].join(" ");

const FindIdPage = () => {
  const [form, setForm] = useState<FindIdFormState>(initialFormState);
  const [foundLoginId, setFoundLoginId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange =
    (field: keyof FindIdFormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
      setFoundLoginId("");
      setErrorMessage("");
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setErrorMessage("이름을 입력해주세요.");
      return;
    }

    if (!form.phone.trim()) {
      setErrorMessage("전화번호를 입력해주세요.");
      return;
    }

    if (!/^[0-9-]+$/.test(form.phone.trim())) {
      setErrorMessage("올바른 전화번호 형식으로 입력해주세요.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setFoundLoginId("");

      const response = await findGuardianId({
        name: form.name.trim(),
        phone: form.phone.trim(),
      });

      if (response.code !== 200 || !response.result?.loginid) {
        setErrorMessage(
          response.message || "입력하신 정보와 일치하는 계정을 찾을 수 없습니다.",
        );
        return;
      }

      setFoundLoginId(response.result.loginid);
    } catch (error) {
      if (isAxiosError<FindIdErrorResponse>(error)) {
        setErrorMessage(
          error.response?.data?.message ||
            "아이디 찾기에 실패했습니다. 다시 시도해주세요.",
        );
        return;
      }

      setErrorMessage("아이디 찾기에 실패했습니다. 다시 시도해주세요.");
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
          to="/login"
          className="rounded-xl border border-blue-500 px-4 py-2 text-sm font-bold text-blue-600 transition hover:bg-blue-50"
        >
          로그인
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 pb-6 sm:px-6 lg:grid-cols-[1fr_0.85fr] lg:items-center">
        <section className="space-y-5">
          <div>
            <p className="text-sm font-bold text-blue-600">MediPaw account support</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-950">
              아이디 찾기
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              가입 시 등록한 이름과 전화번호를 입력하면 로그인 ID를 확인할 수
              있습니다. 입력 정보가 일치하지 않으면 아이디를 찾을 수 없습니다.
            </p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-white/80 p-5 shadow-sm shadow-blue-100/60">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
                i
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900">안내사항</h2>
                <ul className="mt-2 space-y-2 text-xs leading-5 text-slate-600">
                  <li>가입 시 등록한 이름과 전화번호를 입력해주세요.</li>
                  <li>전화번호는 숫자 또는 하이픈을 포함해 입력할 수 있습니다.</li>
                  <li>정보가 일치하면 마스킹된 로그인 ID를 표시합니다.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-xl shadow-blue-100/70 sm:p-6">
          <div className="mb-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl font-bold text-blue-600">
              ID
            </div>
            <h2 className="mt-3 text-2xl font-bold text-slate-950">아이디 찾기</h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              등록된 보호자 정보를 입력해주세요.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-bold text-slate-800" htmlFor="name">
                이름
              </label>
              <input
                id="name"
                value={form.name}
                onChange={handleChange("name")}
                placeholder="이름을 입력해주세요."
                autoComplete="name"
                aria-invalid={Boolean(errorMessage && !form.name.trim())}
                className={inputClassName(Boolean(errorMessage && !form.name.trim()))}
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-800" htmlFor="phone">
                전화번호
              </label>
              <input
                id="phone"
                value={form.phone}
                onChange={handleChange("phone")}
                placeholder="예: 010-1234-5678"
                autoComplete="tel"
                aria-invalid={Boolean(errorMessage && !form.phone.trim())}
                className={inputClassName(Boolean(errorMessage && !form.phone.trim()))}
              />
            </div>

            {errorMessage && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-600">
                {errorMessage}
              </p>
            )}

            {foundLoginId && (
              <div className="rounded-2xl bg-blue-50 px-4 py-5 text-center">
                <p className="text-xs font-bold text-blue-600">확인된 로그인 ID</p>
                <p className="mt-2 text-xl font-black text-blue-700">
                  {foundLoginId}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full rounded-xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isSubmitting ? "확인 중..." : "아이디 찾기"}
            </button>

            <Link
              to="/login"
              className="flex h-11 w-full items-center justify-center rounded-xl border border-blue-500 text-sm font-bold text-blue-600 transition hover:bg-blue-50"
            >
              로그인 화면으로 돌아가기
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

export default FindIdPage;
