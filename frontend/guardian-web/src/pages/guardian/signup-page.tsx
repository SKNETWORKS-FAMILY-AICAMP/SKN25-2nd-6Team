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

interface SignupErrorResponse {
  code?: number;
  message?: string;
}

const initialFormState: SignupFormState = {
  name: "",
  loginid: "",
  phone: "",
  password: "",
  passwordConfirm: "",
};

const serviceItems = [
  {
    title: "AI triage guidance",
    description:
      "Start with symptom details and get clear next-step guidance before visiting a clinic.",
  },
  {
    title: "Reservation support",
    description:
      "Keep consultation context ready so care can move smoothly into a clinic reservation.",
  },
  {
    title: "Care history",
    description:
      "Manage pet health records and consultation notes from one guardian dashboard.",
  },
];

const inputClassName = (hasError?: boolean) =>
  [
    "mt-2 h-12 w-full rounded-2xl border bg-white px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-4",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
      : "border-slate-200 focus:border-blue-500 focus:ring-blue-100",
  ].join(" ");

const helperClassName = (hasError?: boolean) =>
  [
    "mt-1.5 text-xs font-medium",
    hasError ? "text-red-500" : "text-slate-500",
  ].join(" ");

const getFallbackErrorMessage = (message?: string) =>
  message || "Signup failed. Please check your information and try again.";

const getApiFieldError = (message: string): SignupFieldErrors | null => {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("loginid") || lowerMessage.includes("id")) {
    return { loginid: message };
  }

  if (lowerMessage.includes("password")) {
    return { password: message };
  }

  if (lowerMessage.includes("name")) {
    return { name: message };
  }

  if (lowerMessage.includes("phone")) {
    return { phone: message };
  }

  return null;
};

const SignupPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<SignupFormState>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoginIdValid = useMemo(
    () => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{4,20}$/.test(form.loginid.trim()),
    [form.loginid],
  );

  const isPasswordValid = useMemo(
    () =>
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(form.password),
    [form.password],
  );

  const isPhoneValid = useMemo(
    () => /^01[016789]-?\d{3,4}-?\d{4}$/.test(form.phone.trim()),
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

  const validateForm = () => {
    const nextFieldErrors: SignupFieldErrors = {};

    if (!form.name.trim()) {
      nextFieldErrors.name = "Please enter your name.";
    } else if (form.name.trim().length > 30) {
      nextFieldErrors.name = "Name can be up to 30 characters.";
    }

    if (!isLoginIdValid) {
      nextFieldErrors.loginid =
        "Use 4-20 letters and numbers, including at least one of each.";
    }

    if (!isPhoneValid) {
      nextFieldErrors.phone = "Enter a valid mobile number, such as 010-1234-5678.";
    }

    if (!isPasswordValid) {
      nextFieldErrors.password =
        "Use at least 8 characters with letters, numbers, and a special character.";
    }

    if (!form.passwordConfirm) {
      nextFieldErrors.passwordConfirm = "Please confirm your password.";
    } else if (form.password !== form.passwordConfirm) {
      nextFieldErrors.passwordConfirm = "Passwords do not match.";
    }

    return nextFieldErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextFieldErrors = validateForm();
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const response = await signupGuardian({
        loginid: form.loginid.trim(),
        password: form.password,
        name: form.name.trim(),
        phone: form.phone.trim(),
      });

      if (response.code !== 200) {
        const message = getFallbackErrorMessage(response.message);
        const apiFieldError = getApiFieldError(message);

        if (apiFieldError) {
          setFieldErrors(apiFieldError);
          return;
        }

        setErrorMessage(message);
        return;
      }

      setSuccessMessage(response.message || "Signup complete. Moving to login.");
      window.setTimeout(() => navigate("/login"), 800);
    } catch (error) {
      if (isAxiosError<SignupErrorResponse>(error)) {
        const statusCode = error.response?.data?.code ?? error.response?.status;
        const message = getFallbackErrorMessage(error.response?.data?.message);
        const apiFieldError = getApiFieldError(message);

        if (statusCode === 409) {
          setFieldErrors({ loginid: message });
          return;
        }

        if (apiFieldError) {
          setFieldErrors(apiFieldError);
          return;
        }

        setErrorMessage(message);
        return;
      }

      setErrorMessage("A network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 text-slate-900">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/login" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-200">
            M
          </span>
          <div>
            <p className="text-lg font-bold text-blue-700">MediPaw</p>
            <p className="hidden text-xs font-semibold text-slate-500 sm:block">
              Guardian care dashboard
            </p>
          </div>
        </Link>

        <Link
          to="/login"
          className="rounded-2xl border border-blue-500 px-4 py-2 text-sm font-bold text-blue-600 transition hover:bg-blue-50"
        >
          Log in
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 pb-8 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <section className="space-y-5 py-2 sm:py-6">
          <div>
            <p className="text-sm font-bold text-blue-600">
              MediPaw guardian service
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">
              Create a calmer care routine for every pet.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
              Sign up to use AI triage, reservation support, and health record
              tools designed for pet guardians.
            </p>
          </div>

          <div className="grid gap-3">
            {serviceItems.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-blue-100 bg-white/80 p-4 shadow-sm shadow-blue-100/60"
              >
                <h2 className="text-sm font-bold text-slate-950">{item.title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-xl shadow-blue-100/70 sm:p-7">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl font-bold text-blue-600">
              M
            </div>
            <h2 className="mt-3 text-2xl font-bold text-slate-950">
              Guardian signup
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Enter your account details to start using MediPaw.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-slate-800" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  autoComplete="name"
                  value={form.name}
                  onChange={handleChange("name")}
                  placeholder="Your name"
                  aria-invalid={Boolean(fieldErrors.name)}
                  className={inputClassName(Boolean(fieldErrors.name))}
                />
                {fieldErrors.name && (
                  <p className={helperClassName(true)}>{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label
                  className="text-sm font-bold text-slate-800"
                  htmlFor="loginid"
                >
                  Login ID
                </label>
                <input
                  id="loginid"
                  autoComplete="username"
                  value={form.loginid}
                  onChange={handleChange("loginid")}
                  placeholder="guardian123"
                  aria-invalid={Boolean(fieldErrors.loginid)}
                  className={inputClassName(Boolean(fieldErrors.loginid))}
                />
                <p className={helperClassName(Boolean(fieldErrors.loginid))}>
                  {fieldErrors.loginid || "4-20 letters and numbers."}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-800" htmlFor="phone">
                Phone
              </label>
              <input
                id="phone"
                autoComplete="tel"
                inputMode="tel"
                value={form.phone}
                onChange={handleChange("phone")}
                placeholder="010-1234-5678"
                aria-invalid={Boolean(fieldErrors.phone)}
                className={inputClassName(Boolean(fieldErrors.phone))}
              />
              <p className={helperClassName(Boolean(fieldErrors.phone))}>
                {fieldErrors.phone || "Use your mobile phone number."}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  className="text-sm font-bold text-slate-800"
                  htmlFor="password"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange("password")}
                  placeholder="Password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  className={inputClassName(Boolean(fieldErrors.password))}
                />
                <p className={helperClassName(Boolean(fieldErrors.password))}>
                  {fieldErrors.password || "8+ characters with letters, numbers, and symbols."}
                </p>
              </div>

              <div>
                <label
                  className="text-sm font-bold text-slate-800"
                  htmlFor="passwordConfirm"
                >
                  Confirm password
                </label>
                <input
                  id="passwordConfirm"
                  type="password"
                  autoComplete="new-password"
                  value={form.passwordConfirm}
                  onChange={handleChange("passwordConfirm")}
                  placeholder="Confirm password"
                  aria-invalid={Boolean(fieldErrors.passwordConfirm)}
                  className={inputClassName(Boolean(fieldErrors.passwordConfirm))}
                />
                <p className={helperClassName(Boolean(fieldErrors.passwordConfirm))}>
                  {fieldErrors.passwordConfirm || "Re-enter the same password."}
                </p>
              </div>
            </div>

            {errorMessage && (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-600">
                {errorMessage}
              </p>
            )}

            {successMessage && (
              <p className="rounded-2xl bg-blue-50 px-4 py-3 text-center text-sm font-bold text-blue-700">
                {successMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>

            <p className="text-center text-sm font-medium text-slate-500">
              Already have an account?{" "}
              <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700">
                Log in
              </Link>
            </p>
          </form>
        </section>
      </main>
    </div>
  );
};

export default SignupPage;
