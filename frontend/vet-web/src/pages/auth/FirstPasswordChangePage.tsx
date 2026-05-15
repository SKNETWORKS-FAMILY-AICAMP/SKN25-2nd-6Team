import React, { useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Home,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import logo from "../../../../shared/assets/logo/medipaw-symbol.png";
import {
  AuthSession,
  changeFirstPassword,
  getPasswordPolicyStatus,
  isPasswordPolicyValid,
} from "../../api/authApi";

interface FirstPasswordChangePageProps {
  session: AuthSession;
  onPasswordChanged: (session: AuthSession) => void;
  onGoLogin: () => void;
}

export default function FirstPasswordChangePage({
  session,
  onPasswordChanged,
  onGoLogin,
}: FirstPasswordChangePageProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visibleFields, setVisibleFields] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const policyStatus = useMemo(
    () => getPasswordPolicyStatus(newPassword, session.user.id),
    [newPassword, session.user.id]
  );
  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("현재 비밀번호와 동일한 비밀번호는 사용할 수 없습니다.");
      return;
    }

    if (!isPasswordPolicyValid(newPassword, session.user.id)) {
      setError("비밀번호 정책을 모두 충족한 뒤 변경을 완료해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      const changedSession = await changeFirstPassword({
        accessToken: session.accessToken,
        currentPassword,
        newPassword,
        newPasswordConfirm: confirmPassword,
        session,
      });
      onPasswordChanged(changedSession);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "비밀번호 변경 중 오류가 발생했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVisible = (field: keyof typeof visibleFields) => {
    setVisibleFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <main className="min-h-screen bg-[#f5f8ff] px-5 py-4 text-slate-900">
      <div className="mx-auto mb-2 flex max-w-[1400px] justify-end">
        <button
          type="button"
          onClick={onGoLogin}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-white hover:text-blue-600"
        >
          <Home size={19} />
          첫 화면으로
        </button>
      </div>

      <section className="mx-auto flex min-h-[calc(100vh-84px)] max-w-[1400px] items-center justify-center rounded-3xl border border-slate-200 bg-white px-8 py-6 shadow-sm">
        <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="flex flex-col justify-center">
            <div className="mb-8">
              <img src={logo} alt="MediPaw" className="w-[300px]" />

              <p className="mt-2 pl-2 text-base font-bold tracking-[0.1em] text-slate-500">
                동물병원 의료 보조 시스템
              </p>
            </div>

            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
              <ShieldCheck size={17} />
              첫 로그인 보안 설정
            </div>

            <div className="flex justify-center py-3">
              <div className="relative flex h-48 w-48 items-center justify-center rounded-[2rem] bg-blue-50 text-blue-600">
                <ShieldCheck size={112} strokeWidth={1.6} />

                <div className="absolute bottom-6 right-3 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-400 text-white shadow-lg shadow-cyan-100">
                  <Check size={36} strokeWidth={4} />
                </div>
              </div>
            </div>

            <div className="mt-8 text-center lg:text-left">
              <h1 className="text-3xl font-bold leading-tight text-slate-900">
                보안을 위해
                <br />
                비밀번호를 변경해주세요.
              </h1>

              <p className="mt-4 text-base font-semibold leading-7 text-slate-500">
                안전한 서비스 이용을 위해
                <br />
                최초 로그인 시 새로운 비밀번호 설정이 필요합니다.
              </p>
            </div>
          </section>

          <section className="flex flex-col justify-center">
            <div className="mx-auto w-full max-w-[600px] rounded-3xl border border-slate-200 bg-white px-8 py-7 shadow-sm">
              <div className="mb-5 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <LockKeyhole size={26} />
                </div>

                <h2 className="text-2xl font-bold text-slate-900">
                  비밀번호 변경 (첫 로그인)
                </h2>

                <p className="mt-3 text-sm font-medium text-slate-500">
                  {session.user.hospitalName} · {session.user.name}
                </p>
              </div>

              <div className="mb-4 flex items-start gap-3 rounded-xl bg-blue-50 px-4 py-3 text-blue-700">
                <KeyRound size={20} className="mt-0.5 shrink-0" />
                <p className="text-sm font-bold leading-6">
                  계정 보안 강화를 위해 임시 비밀번호를 새 비밀번호로
                  변경해야 시스템을 이용할 수 있습니다.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <PasswordField
                  label="현재 비밀번호"
                  value={currentPassword}
                  visible={visibleFields.current}
                  placeholder="현재 비밀번호를 입력하세요"
                  onChange={setCurrentPassword}
                  onToggleVisible={() => toggleVisible("current")}
                />

                <PasswordField
                  label="새 비밀번호"
                  value={newPassword}
                  visible={visibleFields.next}
                  placeholder="새 비밀번호를 입력하세요"
                  onChange={setNewPassword}
                  onToggleVisible={() => toggleVisible("next")}
                />

                <PasswordField
                  label="새 비밀번호 확인"
                  value={confirmPassword}
                  visible={visibleFields.confirm}
                  placeholder="새 비밀번호를 다시 입력하세요"
                  onChange={setConfirmPassword}
                  onToggleVisible={() => toggleVisible("confirm")}
                />

                {error && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100">
                      <TriangleAlert size={15} fill="currentColor" />
                    </div>

                    <p className="text-sm font-bold leading-5">{error}</p>
                  </div>
                )}

                <div className="rounded-xl bg-blue-50 px-5 py-4">
                  <h3 className="mb-2 text-sm font-bold text-blue-700">
                    비밀번호 정책
                  </h3>

                  <ul className="space-y-1">
                    {policyStatus.map((policy) => (
                      <li
                        key={policy.label}
                        className="flex items-start gap-2 text-sm font-semibold leading-5 text-slate-600"
                      >
                        <CheckCircle2
                          size={16}
                          className={
                            policy.isValid
                              ? "mt-0.5 shrink-0 text-blue-600"
                              : "mt-0.5 shrink-0 text-slate-300"
                          }
                        />
                        {policy.label}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit || isLoading}
                  className="h-12 w-full rounded-xl bg-blue-600 text-base font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {isLoading ? "변경 중..." : "변경 완료"}
                </button>
              </form>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

interface PasswordFieldProps {
  label: string;
  value: string;
  visible: boolean;
  placeholder: string;
  onChange: (value: string) => void;
  onToggleVisible: () => void;
}

function PasswordField({
  label,
  value,
  visible,
  placeholder,
  onChange,
  onToggleVisible,
}: PasswordFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>

      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-12 w-full rounded-xl border border-slate-200 px-4 pr-12 text-sm font-medium outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
        />

        <button
          type="button"
          onClick={onToggleVisible}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-blue-600"
          aria-label={visible ? "비밀번호 숨기기" : "비밀번호 표시"}
        >
          {visible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  );
}
