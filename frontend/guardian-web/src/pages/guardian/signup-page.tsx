import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { Link, useNavigate } from "react-router-dom";

import { signupGuardian } from "../../api/auth-api";

interface SignupFormState {
  name: string;
  loginid: string;
  phone: string;
  password: string;
  passwordConfirm: string;
}

type SignupFieldErrors = Partial<Record<keyof SignupFormState, string>>;

const initialFormState: SignupFormState = {
  name: "",
  loginid: "",
  phone: "",
  password: "",
  passwordConfirm: "",
};

const serviceItems = [
  {
    title: "AI 챗봇 상담",
    description: "반려동물 상태를 입력하면 필요한 상담 흐름을 안내합니다.",
  },
  {
    title: "병원 예약 관리",
    description: "상담 이후 필요한 병원 예약을 한 곳에서 관리할 수 있습니다.",
  },
  {
    title: "건강 기록 확인",
    description: "상담 기록과 건강 상태 변화를 보호자 화면에서 확인합니다.",
  },
];

const inputClassName = (hasError?: boolean) =>
  [
    "mt-1.5 h-10 w-full rounded-xl border px-3 text-sm outline-none transition placeholder:text-slate-400 focus:ring-4",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
      : "border-slate-200 focus:border-blue-500 focus:ring-blue-100",
  ].join(" ");

const getSignupApiFieldError = (message: string): SignupFieldErrors | null => {
  if (/필수 입력값/.test(message)) {
    return {
      name: "이름을 입력해주세요.",
      loginid: "ID를 입력해주세요.",
      password: "비밀번호를 입력해주세요.",
      phone: "전화번호를 입력해주세요.",
    };
  }

  if (/loginid|로그인\s*id|로그인 ID|아이디/i.test(message)) {
    return { loginid: message };
  }

  if (/password|비밀번호/i.test(message)) {
    return { password: message };
  }

  if (/name|이름/i.test(message)) {
    return { name: message };
  }

  if (/phone|전화번호|휴대폰/i.test(message)) {
    return { phone: message };
  }

  return null;
};

interface SignupErrorResponse {
  code?: number;
  message?: string;
}

const getSignupErrorMessage = (message?: string) =>
  message || "회원가입에 실패했습니다.";

const SignupPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<SignupFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isLoginIdValid = useMemo(
    () => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{4,20}$/.test(form.loginid.trim()),
    [form.loginid],
  );
  const isPasswordPolicyValid = useMemo(
    () =>
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(form.password),
    [form.password],
  );
  const isPasswordMatch = useMemo(
    () => form.password.length > 0 && form.password === form.passwordConfirm,
    [form.password, form.passwordConfirm],
  );
  const isPhoneValid = useMemo(
    () => /^[0-9-]+$/.test(form.phone.trim()),
    [form.phone],
  );

  const handleChange =
    (field: keyof SignupFormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
      setFieldErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors[field];
        return nextErrors;
      });
      setErrorMessage("");
      setSuccessMessage("");
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextFieldErrors: SignupFieldErrors = {};

    if (!form.name.trim()) {
      nextFieldErrors.name = "이름을 입력해주세요.";
    } else if (form.name.trim().length > 30) {
      nextFieldErrors.name = "이름은 최대 30자까지 입력할 수 있습니다.";
    }

    if (!isLoginIdValid) {
      nextFieldErrors.loginid = "ID는 영문·숫자 조합 4~20자로 입력해주세요.";
    }

    if (!isPhoneValid) {
      nextFieldErrors.phone = "전화번호는 숫자와 하이픈만 입력할 수 있습니다.";
    }

    if (!isPasswordPolicyValid) {
      nextFieldErrors.password =
        "비밀번호는 영문, 숫자, 특수문자를 포함해 8자 이상 입력해주세요.";
    }

    if (!isPasswordMatch) {
      nextFieldErrors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setErrorMessage("");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await signupGuardian({
        loginid: form.loginid.trim(),
        password: form.password,
        name: form.name.trim(),
        phone: form.phone.trim(),
      });

      if (response.code !== 200) {
        const message = getSignupErrorMessage(response.message);
        const apiFieldError = getSignupApiFieldError(message);

        if (apiFieldError) {
          setFieldErrors(apiFieldError);
          setErrorMessage("");
          return;
        }

        setErrorMessage(message);
        return;
      }

      setSuccessMessage(response.message || "회원가입이 완료되었습니다.");
      setTimeout(() => navigate("/login"), 700);
    } catch (error) {
      if (isAxiosError<SignupErrorResponse>(error)) {
        const code = error.response?.data?.code ?? error.response?.status;
        const message = getSignupErrorMessage(error.response?.data?.message);

        if (code === 409) {
          setFieldErrors({ loginid: message });
          setErrorMessage("");
          return;
        }

        if (code === 400) {
          const apiFieldError = getSignupApiFieldError(message);

          if (apiFieldError) {
            setFieldErrors(apiFieldError);
            setErrorMessage("");
            return;
          }

          setErrorMessage(message || "필수 입력값을 확인해주세요.");
          return;
        }

        if (code === 500) {
          setErrorMessage("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
          return;
        }

        const apiFieldError = getSignupApiFieldError(message);
        if (apiFieldError) {
          setFieldErrors(apiFieldError);
          setErrorMessage("");
          return;
        }

        setErrorMessage(message);
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
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
            M
          </span>
          <div>
            <p className="text-base font-bold text-blue-700 sm:text-lg">MediPaw</p>
            <p className="hidden text-xs font-medium text-slate-500 sm:block">
              보호자 반려동물 상담 및 예약 보조 서비스
            </p>
          </div>
        </Link>

        <Link
          to="/login"
          className="rounded-full border border-blue-500 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
        >
          로그인
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 pb-6 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <section className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-blue-600">MediPaw guardian service</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-950">
              우리 아이의 건강을
              <br />
              더 쉽게 지켜주세요
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              MediPaw는 보호자가 상담부터 예약, 기록 관리까지 자연스럽게 이어갈 수
              있도록 돕는 반려동물 케어 서비스입니다.
            </p>
          </div>

          <div className="grid gap-3">
            {serviceItems.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-blue-100 bg-white/80 p-4 shadow-sm shadow-blue-100/60"
              >
                <h2 className="text-sm font-bold text-slate-900">{item.title}</h2>
                <p className="mt-1 text-xs leading-5 text-slate-600">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="w-full rounded-3xl border border-blue-100 bg-white p-5 shadow-xl shadow-blue-100/70 sm:p-6">
          <div className="mb-4 text-center">
            <h1 className="text-2xl font-bold text-slate-950">회원가입</h1>
            <p className="mt-1 text-sm text-slate-500">
              MediPaw를 이용하기 위해 정보를 입력해주세요.
            </p>
          </div>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-slate-800" htmlFor="name">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  value={form.name}
                  onChange={handleChange("name")}
                  placeholder="이름을 입력해주세요."
                  aria-invalid={Boolean(fieldErrors.name)}
                  className={inputClassName(Boolean(fieldErrors.name))}
                />
                {fieldErrors.name && (
                  <p className="mt-1 text-xs font-medium text-red-500">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-800" htmlFor="loginid">
                  ID <span className="text-red-500">*</span>
                </label>
                <input
                  id="loginid"
                  value={form.loginid}
                  onChange={handleChange("loginid")}
                  placeholder="ID를 입력해주세요."
                  aria-invalid={Boolean(fieldErrors.loginid)}
                  className={inputClassName(Boolean(fieldErrors.loginid))}
                />
                <p
                  className={`mt-1 text-xs ${
                    fieldErrors.loginid ? "font-medium text-red-500" : "text-slate-500"
                  }`}
                >
                  {fieldErrors.loginid || "영문, 숫자 혼합 4~20자"}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-slate-800" htmlFor="password">
                  비밀번호 <span className="text-red-500">*</span>
                </label>
                <input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange("password")}
                  placeholder="비밀번호를 입력해주세요."
                  aria-invalid={Boolean(fieldErrors.password)}
                  className={inputClassName(Boolean(fieldErrors.password))}
                />
                {fieldErrors.password && (
                  <p className="mt-1 text-xs font-medium text-red-500">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div>
                <label
                  className="text-sm font-semibold text-slate-800"
                  htmlFor="passwordConfirm"
                >
                  비밀번호 확인 <span className="text-red-500">*</span>
                </label>
                <input
                  id="passwordConfirm"
                  type="password"
                  value={form.passwordConfirm}
                  onChange={handleChange("passwordConfirm")}
                  placeholder="비밀번호를 다시 입력해주세요."
                  aria-invalid={Boolean(fieldErrors.passwordConfirm)}
                  className={inputClassName(Boolean(fieldErrors.passwordConfirm))}
                />
                <p
                  className={`mt-1 text-xs ${
                    fieldErrors.passwordConfirm
                      ? "font-medium text-red-500"
                      : "text-slate-500"
                  }`}
                >
                  {fieldErrors.passwordConfirm || "비밀번호를 한 번 더 입력해주세요."}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-800" htmlFor="phone">
                전화번호 <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                value={form.phone}
                onChange={handleChange("phone")}
                placeholder="예: 010-1234-5678"
                aria-invalid={Boolean(fieldErrors.phone)}
                className={inputClassName(Boolean(fieldErrors.phone))}
              />
              <p
                className={`mt-1 text-xs ${
                  fieldErrors.phone ? "font-medium text-red-500" : "text-slate-500"
                }`}
              >
                {fieldErrors.phone || "숫자와 하이픈만 입력 가능합니다."}
              </p>
            </div>

            {errorMessage && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-center">
                <p className="text-sm font-semibold text-red-600">{errorMessage}</p>
                <button
                  type="button"
                  onClick={() => setErrorMessage("")}
                  className="mt-3 rounded-lg border border-red-200 px-4 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                >
                  확인
                </button>
              </div>
            )}
            {successMessage && (
              <p className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
                {successMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full rounded-xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isSubmitting ? "가입 처리 중..." : "회원가입"}
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold text-slate-400">또는</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <p className="text-center text-sm text-slate-500">
              이미 계정이 있으신가요?{" "}
              <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700">
                로그인
              </Link>
            </p>
          </form>
        </section>
      </main>
    </div>
  );
};

export default SignupPage;
