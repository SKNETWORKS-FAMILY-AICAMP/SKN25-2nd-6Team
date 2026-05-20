import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useMatch, useNavigate } from "react-router-dom";

import pawOnlyLogo from "../../../../shared/assets/logo/medipaw-pawonly.png";
import {
  createPet,
  getPet,
  updatePet,
} from "../../api/pets-api";
import GuardianNavbar from "../../components/guardian-navbar";
import PetForm from "../../components/pets/pet-form";
import PetImageUploader from "../../components/pets/pet-image-uploader";
import { usePetForm } from "../../hooks/use-pet-form";

const maxImageSize = 5 * 1024 * 1024;

const PawIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M8.4 9.9c1.1 0 1.9-1.3 1.9-2.9S9.5 4.1 8.4 4.1 6.5 5.4 6.5 7s.8 2.9 1.9 2.9Zm7.2 0c1.1 0 1.9-1.3 1.9-2.9s-.8-2.9-1.9-2.9-1.9 1.3-1.9 2.9.8 2.9 1.9 2.9ZM5.4 13.2c.9-.3 1.2-1.8.7-3.2-.5-1.5-1.7-2.4-2.6-2.1-.9.3-1.2 1.8-.7 3.2.5 1.5 1.7 2.4 2.6 2.1Zm13.2 0c.9.3 2.1-.6 2.6-2.1.5-1.4.2-2.9-.7-3.2-.9-.3-2.1.6-2.6 2.1-.5 1.4-.2 2.9.7 3.2ZM12 11.3c-3.2 0-5.8 2.4-5.8 5.2 0 1.8 1.5 3.1 3.2 3.1 1 0 1.7-.4 2.6-.4s1.6.4 2.6.4c1.7 0 3.2-1.3 3.2-3.1 0-2.8-2.6-5.2-5.8-5.2Z" />
  </svg>
);

const PetRegisterPage = () => {
  const navigate = useNavigate();
  const detailRouteMatch = useMatch("/pets/:petId");
  const editRouteMatch = useMatch("/pets/:petId/edit");
  const isEditRoute = Boolean(editRouteMatch);
  const detailPetId = detailRouteMatch?.params.petId;
  const editPetId = editRouteMatch?.params.petId;
  const isDetailRoute = Boolean(detailRouteMatch && detailPetId !== "register");
  const routePetId = isEditRoute ? editPetId : isDetailRoute ? detailPetId : undefined;
  const parsedPetId = routePetId ? Number(routePetId) : NaN;
  const isPetDataRoute = isDetailRoute || isEditRoute;
  const isValidPetId =
    isPetDataRoute && Number.isFinite(parsedPetId) && parsedPetId > 0;
  const selectedPetId = isValidPetId ? parsedPetId : undefined;
  const isDetailMode = isDetailRoute && isValidPetId;
  const isEditMode = isEditRoute && isValidPetId;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const customSpeciesInputRef = useRef<HTMLInputElement | null>(null);
  const {
    form,
    errors,
    previewUrl,
    setErrors,
    setPreviewUrl,
    resetPetFormState,
    applyPetToForm,
    updateForm,
    handleNameChange,
    handleNotesChange,
    validateForm,
    buildPayload,
    buildUpdatePayload,
  } = usePetForm({ customSpeciesInputRef });
  const [submitMessage, setSubmitMessage] = useState("");
  const [loadMessage, setLoadMessage] = useState(
    isPetDataRoute && !isValidPetId ? "잘못된 접근입니다." : "",
  );
  const [isLoading, setIsLoading] = useState(Boolean(isDetailMode || isEditMode));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isPetDataRoute && !isValidPetId) {
      resetPetFormState();
      setLoadMessage("잘못된 접근입니다.");
      setIsLoading(false);
      return;
    }

    if (!isPetDataRoute) {
      resetPetFormState();
      setLoadMessage("");
      setIsLoading(false);
      return;
    }

    if (!selectedPetId) {
      return;
    }

    let isMounted = true;

    const loadPet = async () => {
      try {
        setIsLoading(true);
        setLoadMessage("");

        const response = await getPet(selectedPetId);
        if (!isMounted) {
          return;
        }

        if (response.code !== 200) {
          setLoadMessage(response.message || "반려동물 정보를 불러오지 못했습니다.");
          return;
        }

        applyPetToForm(response.result);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (isAxiosError<{ message?: string }>(error)) {
          setLoadMessage(
            error.response?.data?.message ||
              "반려동물 정보를 불러오지 못했습니다.",
          );
          return;
        }

        setLoadMessage("반려동물 정보를 불러오지 못했습니다.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPet();

    return () => {
      isMounted = false;
    };
  }, [applyPetToForm, isPetDataRoute, isValidPetId, resetPetFormState, selectedPetId]);

  const closeModal = () => {
    navigate("/home");
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (isDetailMode) {
      return;
    }

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setErrors((current) => ({
        ...current,
        profileImage: "JPG, PNG 파일만 업로드할 수 있습니다.",
      }));
      event.target.value = "";
      return;
    }

    if (file.size > maxImageSize) {
      setErrors((current) => ({
        ...current,
        profileImage: "대표 사진은 최대 5MB까지 업로드할 수 있습니다.",
      }));
      event.target.value = "";
      return;
    }

    setErrors((current) => ({ ...current, profileImage: undefined }));

    // TODO: This base64 preview/payload is temporary for MVP. Production should
    // request a FastAPI presigned URL, upload directly to S3, then save the
    // resulting CloudFront URL as profile_image.
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitMessage("");

    if (isDetailMode) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const updatePayload = isEditMode ? buildUpdatePayload() : undefined;

      if (isEditMode && Object.keys(updatePayload || {}).length === 0) {
        navigate("/home", {
          replace: true,
          state: { petUpdatedAt: Date.now() },
        });
        return;
      }

      let petIdToRefresh: number | undefined;
      const response =
        isEditMode && selectedPetId
          ? await updatePet(selectedPetId, updatePayload || {})
          : await createPet(buildPayload());

      if (isEditMode) {
        petIdToRefresh = selectedPetId;
      } else {
        petIdToRefresh = (response as { result?: { pet_id?: number } }).result
          ?.pet_id;
      }

      if (!([200, 201] as number[]).includes(response.code)) {
        setSubmitMessage(
          response.message ||
            (isEditMode
              ? "반려동물 수정에 실패했습니다."
              : "반려동물 등록에 실패했습니다."),
        );
        return;
      }

      if (petIdToRefresh) {
        await getPet(petIdToRefresh);
      }

      navigate("/home", {
        replace: true,
        state: isEditMode
          ? { petUpdatedAt: Date.now() }
          : { petRegisteredAt: Date.now() },
      });
    } catch (error) {
      if (isAxiosError<{ message?: string }>(error)) {
        setSubmitMessage(
          error.response?.data?.message ||
            (isEditMode
              ? "반려동물 수정에 실패했습니다."
              : "반려동물 등록에 실패했습니다."),
        );
        return;
      }

      setSubmitMessage(
        isEditMode
          ? "반려동물 수정에 실패했습니다."
          : "반려동물 등록에 실패했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-slate-900">
      <GuardianNavbar />

      <main className="mx-auto w-full max-w-[1280px] px-6 py-8">
        <section className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
            <img
              src={pawOnlyLogo}
              alt=""
              aria-hidden="true"
              className="h-8 w-8 object-contain"
            />
          </div>
          <div>
            <h1
              className={`font-black text-slate-950 ${
                isDetailMode ? "text-xl" : "text-2xl"
              }`}
            >
              {isDetailMode
                ? "반려동물 상세 정보"
                : isEditRoute
                  ? "반려동물 수정하기"
                  : "반려동물 등록하기"}
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {isDetailMode
                ? "등록된 반려동물 정보를 확인해주세요."
                : "반려동물 정보를 입력해주세요."}
            </p>
          </div>
        </section>

        {isLoading ? (
          <section className="mt-6 flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-100 border-t-violet-600" />
          </section>
        ) : loadMessage ? (
          <section className="mt-6 rounded-2xl border border-red-100 bg-white px-6 py-10 text-center shadow-sm">
            <h2 className="text-lg font-black text-slate-900">
              반려동물 정보를 불러오지 못했습니다
            </h2>
            <p className="mt-3 text-sm font-semibold text-red-500">
              {loadMessage}
            </p>
            <button
              type="button"
              onClick={() => navigate("/home")}
              className="mt-6 h-11 rounded-xl bg-violet-600 px-6 text-sm font-black text-white transition hover:bg-violet-700"
            >
              홈으로 돌아가기
            </button>
          </section>
        ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
          <aside className="space-y-6">
            <PetImageUploader
              previewUrl={previewUrl}
              isDetailMode={isDetailMode}
              fileInputRef={fileInputRef}
              onImageChange={handleImageChange}
              errorMessage={errors.profileImage}
            />

            <section className="relative overflow-hidden rounded-2xl bg-violet-50 p-6 ring-1 ring-violet-100">
              <div className="flex items-center gap-2 text-violet-700">
                <PawIcon className="h-5 w-5" />
                <h2 className="text-lg font-black">안내사항</h2>
              </div>
              <ul className="mt-6 space-y-4 pr-6 text-sm font-semibold leading-6 text-slate-700">
                {isDetailMode ? (
                  <>
                    <li>수정이 필요한 정보가 있다면 하단의 수정하기 버튼을 눌러주세요.</li>
                    <li>정확한 정보는 AI 상담과 진료 예약 정확도 향상에 도움이 됩니다.</li>
                  </>
                ) : (
                  <>
                    <li>입력하지 않은 항목은 나중에 반려동물 관리에서 수정할 수 있습니다.</li>
                    <li>정확한 정보는 AI 상담과 진료 예약 정확도 향상에 도움이 됩니다.</li>
                  </>
                )}
              </ul>
              <div className="pointer-events-none mt-8 flex justify-center gap-3 text-6xl leading-none">
                <span>🐶</span>
                <span>🐱</span>
              </div>
            </section>
          </aside>

          <form
            onSubmit={handleSubmit}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <PetForm
              form={form}
              errors={errors}
              isDetailMode={isDetailMode}
              customSpeciesInputRef={customSpeciesInputRef}
              updateForm={updateForm}
              handleNameChange={handleNameChange}
              handleNotesChange={handleNotesChange}
            />

            {submitMessage ? (
              <p className="mx-6 mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                {submitMessage}
              </p>
            ) : null}

            <footer className="mt-4 flex justify-end gap-3 border-t border-slate-100 px-6 py-5">
              <button
                type="button"
                onClick={closeModal}
                className="h-11 min-w-32 rounded-xl border border-slate-200 bg-white px-6 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                {isDetailMode ? "목록으로" : "취소"}
              </button>
              {isDetailMode ? (
                <button
                  type="button"
                  onClick={() => navigate(`/pets/${selectedPetId}/edit`)}
                  className="inline-flex h-11 min-w-40 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 text-sm font-black text-white shadow-sm transition hover:from-violet-700 hover:to-indigo-700"
                >
                  <PawIcon className="h-4 w-4" />
                  수정하기
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-11 min-w-40 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 text-sm font-black text-white shadow-sm transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:from-violet-300 disabled:to-indigo-300"
                >
                  <PawIcon className="h-4 w-4" />
                  {isSubmitting
                    ? isEditMode
                      ? "수정 중..."
                      : "등록 중..."
                    : isEditMode
                      ? "수정하기"
                      : "등록하기"}
                </button>
              )}
            </footer>
          </form>
        </div>
        )}
      </main>
    </div>
  );
};

export default PetRegisterPage;
