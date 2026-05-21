import { useState } from "react";
import {
  CheckCircle2,
  Clock3,
  LockKeyhole,
  Save,
  TriangleAlert,
  Utensils,
  X,
} from "lucide-react";
import {
  AuthSession,
  changePassword,
  isPasswordPolicyValid,
  getPasswordPolicyStatus,
} from "../../api/authApi";
import AppLayout, { AppMenuId } from "../../layouts/AppLayout";

interface SettingsPageProps {
  session: AuthSession;
  onLogout: () => void;
  onNavigate: (menuId: AppMenuId) => void;
}

const timeOptions = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
];

export default function SettingsPage({
  session,
  onLogout,
  onNavigate,
}: SettingsPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [operationSettings, setOperationSettings] = useState({
    openingTime: "09:00",
    closingTime: "18:00",
    lunchStart: "12:00",
    lunchEnd: "13:00",
  });
  const [isOperationSaved, setIsOperationSaved] = useState(false);

  const updateOperationSetting = (
    key: keyof typeof operationSettings,
    value: string
  ) => {
    setOperationSettings((current) => ({ ...current, [key]: value }));
    setIsOperationSaved(false);
  };

  return (
    <AppLayout
      session={session}
      activeMenu="settings"
      notificationCount={1}
      onLogout={onLogout}
      onNavigate={onNavigate}
    >
      {isModalOpen && (
        <PasswordChangeModal
          session={session}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      <div className="min-h-[calc(100vh-72px)] bg-[#f7f9fc] px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-[#151b28]">설정</h1>
          <p className="mt-1.5 text-sm font-bold text-[#65718a]">
            병원 운영 환경 및 계정 보안을 관리합니다.
          </p>
        </div>

        <div className="max-w-3xl space-y-4">
          <section className="rounded-xl border border-[#e5eaf2] bg-white shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-[#e5eaf2] px-6 py-4">
              <Clock3 className="h-5 w-5 text-[#2f7df6]" strokeWidth={2.2} />
              <div>
                <h2 className="text-base font-extrabold text-[#151b28]">
                  병원 운영 시간
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-[#8595ae]">
                  이후 API 연결 전까지 화면에서 설정값을 먼저 확인합니다.
                </p>
              </div>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <TimeSelectField
                  label="진료 시작 시간"
                  value={operationSettings.openingTime}
                  onChange={(value) =>
                    updateOperationSetting("openingTime", value)
                  }
                />
                <TimeSelectField
                  label="진료 마감 시간"
                  value={operationSettings.closingTime}
                  onChange={(value) =>
                    updateOperationSetting("closingTime", value)
                  }
                />
              </div>

              <div className="rounded-xl border border-[#edf1f6] bg-[#fbfcfe] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-[#f28c18]" />
                  <p className="text-sm font-extrabold text-[#1d2a57]">
                    점심시간 설정
                  </p>
                  <span className="rounded-full bg-[#fff4e5] px-2 py-0.5 text-[11px] font-extrabold text-[#c87832]">
                    예약 블락
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <TimeSelectField
                    label="점심 시작"
                    value={operationSettings.lunchStart}
                    onChange={(value) =>
                      updateOperationSetting("lunchStart", value)
                    }
                  />
                  <TimeSelectField
                    label="점심 종료"
                    value={operationSettings.lunchEnd}
                    onChange={(value) =>
                      updateOperationSetting("lunchEnd", value)
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-[#f7f9fc] px-4 py-3">
                <p className="text-xs font-bold text-[#65718a]">
                  현재 설정: {operationSettings.openingTime} -{" "}
                  {operationSettings.closingTime}, 점심{" "}
                  {operationSettings.lunchStart} - {operationSettings.lunchEnd}
                </p>
                <button
                  type="button"
                  onClick={() => setIsOperationSaved(true)}
                  className="flex h-9 items-center gap-2 rounded-lg bg-[#2f7df6] px-4 text-sm font-extrabold text-white transition hover:bg-[#1a6de8]"
                >
                  <Save className="h-4 w-4" />
                  저장
                </button>
              </div>

              {isOperationSaved && (
                <p className="text-xs font-extrabold text-[#16a34a]">
                  운영 시간 설정이 화면에 임시 저장되었습니다.
                </p>
              )}
            </div>
          </section>

          {/* 계정 및 보안 섹션 */}
          <section className="rounded-xl border border-[#e5eaf2] bg-white shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-[#e5eaf2] px-6 py-4">
              <LockKeyhole className="h-5 w-5 text-[#2f7df6]" strokeWidth={2.2} />
              <h2 className="text-base font-extrabold text-[#151b28]">
                계정 및 보안
              </h2>
            </div>

            <div className="px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-extrabold text-[#1d2a57]">
                    관리자 비밀번호 변경
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#8595ae]">
                    계정 보안을 위해 정기적으로 비밀번호를 변경해주세요.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="h-9 rounded-lg border border-[#a8cbff] bg-white px-4 text-sm font-extrabold text-[#2f7df6] transition hover:bg-[#edf5ff] whitespace-nowrap"
                >
                  비밀번호 변경
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

function PasswordChangeModal({
  session,
  onClose,
}: {
  session: AuthSession;
  onClose: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    !isLoading;

  const policyStatus = getPasswordPolicyStatus(newPassword, session.user.id);

  const handleClose = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    onClose();
  };

  const handleSubmit = async () => {
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
      await changePassword({
        accessToken: session.accessToken,
        currentPassword,
        newPassword,
        newPasswordConfirm: confirmPassword,
      });
      setSuccess(true);
      setTimeout(() => onClose(), 1800);
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-[480px] rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-[#e5eaf2] px-6 py-4">
          <div>
            <h2 className="text-lg font-extrabold text-[#151b28]">
              비밀번호 변경
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-[#8595ae]">
              다시 사용하신 비밀번호를 입력해주세요.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8595ae] transition hover:bg-[#f0f4fa] hover:text-[#344055]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 본문 */}
        <div className="px-6 py-5 space-y-4">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#edf5ff]">
                <CheckCircle2 className="h-8 w-8 text-[#2f7df6]" />
              </div>
              <p className="text-base font-extrabold text-[#1d2a57]">
                비밀번호가 변경되었습니다.
              </p>
              <p className="text-sm font-semibold text-[#8595ae]">
                잠시 후 자동으로 닫힙니다.
              </p>
            </div>
          ) : (
            <>
              <PasswordInputField
                label="현재 비밀번호"
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder="현재 비밀번호 입력"
              />
              <PasswordInputField
                label="새 비밀번호"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="새 비밀번호 입력"
              />
              <PasswordInputField
                label="새 비밀번호 확인"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="새 비밀번호 재입력"
              />

              {newPassword.length > 0 && (
                <ul className="rounded-lg bg-[#f8fafd] px-4 py-3 space-y-1.5">
                  {policyStatus.map((p) => (
                    <li
                      key={p.label}
                      className="flex items-center gap-2 text-xs font-semibold"
                    >
                      <CheckCircle2
                        className={`h-3.5 w-3.5 shrink-0 ${p.isValid ? "text-[#2f7df6]" : "text-[#c5cfe0]"}`}
                      />
                      <span className={p.isValid ? "text-[#4d5874]" : "text-[#b0b9cc]"}>
                        {p.label}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {error && (
                <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <p className="text-sm font-bold text-red-600">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* 푸터 */}
        {!success && (
          <div className="flex justify-end gap-3 border-t border-[#e5eaf2] px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              className="h-10 rounded-lg border border-[#dfe6f1] px-5 text-sm font-extrabold text-[#52607a] transition hover:bg-[#f0f4fa]"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="h-10 rounded-lg bg-[#2f7df6] px-5 text-sm font-extrabold text-white transition hover:bg-[#1a6de8] disabled:cursor-not-allowed disabled:bg-[#a8cbff]"
            >
              {isLoading ? "변경 중..." : "변경하기"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PasswordInputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-extrabold text-[#52607a]">
        {label}
      </label>
      <div className="relative">
        <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa5b8]" />
        <input
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-12 w-full rounded-lg border border-[#dfe6f1] bg-white pl-10 pr-4 text-sm font-bold text-[#1d2a57] outline-none transition placeholder:text-[#c5cfe0] focus:border-[#8bbcff] focus:ring-2 focus:ring-[#e6f1ff]"
        />
      </div>
    </div>
  );
}

function TimeSelectField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-0 text-xs font-extrabold text-[#52607a]">
      <span className="mb-1.5 block">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-[#dfe6f1] bg-white px-3 text-sm font-extrabold text-[#1d2a57] outline-none transition focus:border-[#8bbcff] focus:ring-2 focus:ring-[#e6f1ff]"
      >
        {timeOptions.map((time) => (
          <option key={time} value={time}>
            {time}
          </option>
        ))}
      </select>
    </label>
  );
}
