import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { Link } from "react-router-dom";

import {
  getMyProfile,
  updateMyProfile,
  type MyProfile,
} from "../../api/user-api";
import ActionButton from "../../components/common/action-button";
import PageHeader from "../../components/common/page-header";
import SectionCard from "../../components/common/section-card";
import GuardianLayout from "../../layouts/guardian-layout";
import { useAuthStore } from "../../stores/auth-store";

interface ApiMessageResponse {
  code?: number;
  message?: string;
}

interface EditProfileForm {
  name: string;
  phone: string;
}

const inputClassName = (hasError?: boolean) =>
  [
    "mt-2 h-12 w-full rounded-xl border bg-white px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-4",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
      : "border-slate-200 focus:border-blue-500 focus:ring-blue-100",
  ].join(" ");

const getErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (isAxiosError<ApiMessageResponse | string>(error)) {
    const responseData = error.response?.data;

    if (typeof responseData === "string") {
      try {
        return (
          (JSON.parse(responseData) as ApiMessageResponse).message ||
          fallbackMessage
        );
      } catch {
        return fallbackMessage;
      }
    }

    return responseData?.message || fallbackMessage;
  }

  return fallbackMessage;
};

const isValidPhone = (phone: string) =>
  /^01[016789]-?\d{3,4}-?\d{4}$/.test(phone.trim());

const ProfileSkeleton = () => (
  <SectionCard>
    <div className="animate-pulse space-y-5">
      <div className="h-5 w-32 rounded bg-slate-100" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-24 rounded-xl bg-slate-100" />
        <div className="h-24 rounded-xl bg-slate-100" />
        <div className="h-24 rounded-xl bg-slate-100" />
      </div>
    </div>
  </SectionCard>
);

interface EditProfileModalProps {
  profile: MyProfile;
  onClose: () => void;
  onSaved: (profile: Pick<MyProfile, "name" | "phone">, message: string) => void;
}

const EditProfileModal = ({
  profile,
  onClose,
  onSaved,
}: EditProfileModalProps) => {
  const [form, setForm] = useState<EditProfileForm>({
    name: profile.name,
    phone: profile.phone,
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedName = form.name.trim();
  const trimmedPhone = form.phone.trim();
  const isUnchanged =
    trimmedName === profile.name && trimmedPhone === profile.phone;
  const nameError = !trimmedName ? "이름을 입력해주세요." : "";
  const phoneError = !isValidPhone(trimmedPhone)
    ? "010-1234-5678 형식의 휴대폰 번호를 입력해주세요."
    : "";
  const canSubmit =
    !isSubmitting && !isUnchanged && !nameError && !phoneError;

  const handleChange =
    (field: keyof EditProfileForm) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
      setErrorMessage("");
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const response = await updateMyProfile({
        name: trimmedName,
        phone: trimmedPhone,
      });

      if (response.code !== 200) {
        setErrorMessage(response.message || "회원 정보 수정에 실패했습니다.");
        return;
      }

      onSaved(
        {
          name: trimmedName,
          phone: trimmedPhone,
        },
        response.message || "회원 정보가 수정되었습니다.",
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "회원 정보 수정에 실패했습니다."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 px-4">
      <section className="w-full max-w-lg rounded-2xl bg-white shadow-2xl shadow-slate-900/20">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 className="text-lg font-black text-slate-950">회원 정보 수정</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="회원 정보 수정 닫기"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 sm:px-6">
          <div>
            <label className="text-sm font-bold text-slate-800" htmlFor="name">
              이름
            </label>
            <input
              id="name"
              value={form.name}
              onChange={handleChange("name")}
              autoComplete="name"
              aria-invalid={Boolean(nameError)}
              className={inputClassName(Boolean(nameError))}
            />
            {nameError ? (
              <p className="mt-1.5 text-xs font-semibold text-red-500">
                {nameError}
              </p>
            ) : null}
          </div>

          <div className="mt-4">
            <label className="text-sm font-bold text-slate-800" htmlFor="phone">
              휴대폰 번호
            </label>
            <input
              id="phone"
              value={form.phone}
              onChange={handleChange("phone")}
              autoComplete="tel"
              inputMode="tel"
              placeholder="010-1234-5678"
              aria-invalid={Boolean(phoneError)}
              className={inputClassName(Boolean(phoneError))}
            />
            {phoneError ? (
              <p className="mt-1.5 text-xs font-semibold text-red-500">
                {phoneError}
              </p>
            ) : null}
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-12 rounded-xl border border-slate-200 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="h-12 rounded-xl bg-blue-600 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              {isSubmitting ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

const MypagePage = () => {
  const updateGuardianProfile = useAuthStore(
    (state) => state.updateGuardianProfile,
  );
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadMessage, setLoadMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        setIsLoading(true);
        setLoadMessage("");

        const response = await getMyProfile();
        if (!isMounted) {
          return;
        }

        if (response.code !== 200) {
          setLoadMessage(response.message || "회원 정보를 불러오지 못했습니다.");
          return;
        }

        setProfile(response.result);
        updateGuardianProfile({
          name: response.result.name,
          phone: response.result.phone,
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLoadMessage(getErrorMessage(error, "회원 정보를 불러오지 못했습니다."));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [updateGuardianProfile]);

  const profileItems = useMemo(
    () =>
      profile
        ? [
            { label: "이름", value: profile.name },
            { label: "휴대폰 번호", value: profile.phone },
            { label: "가입일", value: profile.created_at },
          ]
        : [],
    [profile],
  );

  const handleProfileSaved = (
    nextProfile: Pick<MyProfile, "name" | "phone">,
    message: string,
  ) => {
    setProfile((current) =>
      current
        ? {
            ...current,
            ...nextProfile,
          }
        : current,
    );
    updateGuardianProfile(nextProfile);
    setNoticeMessage(message);
    setIsEditOpen(false);
  };

  return (
    <GuardianLayout>
      <PageHeader
        title="마이페이지"
        description="보호자 계정 정보와 보안 설정을 관리합니다."
        rightAction={
          <Link
            to="/mypage/password"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-blue-200 bg-white px-5 text-sm font-black text-blue-600 transition hover:bg-blue-50"
          >
            비밀번호 변경
          </Link>
        }
      />

        {noticeMessage ? (
          <div className="mb-5 rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
            {noticeMessage}
          </div>
        ) : null}

        {isLoading ? (
          <ProfileSkeleton />
        ) : loadMessage ? (
          <section className="rounded-2xl border border-rose-100 bg-white px-6 py-10 text-center shadow-sm">
            <h2 className="text-lg font-black text-slate-950">
              회원 정보를 불러오지 못했습니다.
            </h2>
            <p className="mt-3 text-sm font-bold text-rose-600">
              {loadMessage}
            </p>
            <ActionButton
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6"
            >
              다시 시도
            </ActionButton>
          </section>
        ) : profile ? (
          <SectionCard>
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  회원 정보
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  이름과 휴대폰 번호를 최신 정보로 유지해주세요.
                </p>
              </div>
              <ActionButton
                type="button"
                onClick={() => {
                  setNoticeMessage("");
                  setIsEditOpen(true);
                }}
              >
                정보 수정
              </ActionButton>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {profileItems.map((item) => (
                <article
                  key={item.label}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-5"
                >
                  <p className="text-xs font-black text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-3 break-words text-base font-black text-slate-950">
                    {item.value}
                  </p>
                </article>
              ))}
            </div>
          </SectionCard>
        ) : null}

      {isEditOpen && profile ? (
        <EditProfileModal
          profile={profile}
          onClose={() => setIsEditOpen(false)}
          onSaved={handleProfileSaved}
        />
      ) : null}
    </GuardianLayout>
  );
};

export default MypagePage;
