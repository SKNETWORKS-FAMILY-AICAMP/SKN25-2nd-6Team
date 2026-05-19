import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useMatch, useNavigate, useParams } from "react-router-dom";

import pawOnlyLogo from "../../../../shared/assets/logo/medipaw-pawonly.png";
import {
  createPet,
  getPet,
  updatePet,
  type CreatePetPayload,
  type Pet,
} from "../../api/pets-api";
import GuardianNavbar from "../../components/guardian-navbar";

const speciesOptions = ["강아지", "고양이", "기타"];
const genderOptions = ["수컷", "암컷", "모름"];
const neuteredOptions = ["예", "아니오", "모름"];
const defaultProfileImages = [
  "/assets/profile1.png",
  "/assets/profile2.png",
  "/assets/profile3.png",
  "/assets/profile4.png",
  "/assets/profile5.png",
  "/assets/profile6.png",
];
const maxImageSize = 5 * 1024 * 1024;
const maxNotesLength = 200;

interface FormState {
  petname: string;
  species: string;
  customSpecies: string;
  breed: string;
  gender: string;
  isNeutered: string;
  birthDate: string;
  isBirthUnknown: boolean;
  weight: string;
  checkupDate: string;
  isCheckupUnknown: boolean;
  notes: string;
}

type FormErrors = Partial<Record<keyof FormState | "profileImage", string>>;
type PetPayload = CreatePetPayload & {
  breed?: string;
  birth_date?: string;
  checkup_date?: string;
  notes?: string;
};

const initialForm: FormState = {
  petname: "",
  species: "",
  customSpecies: "",
  breed: "",
  gender: "",
  isNeutered: "",
  birthDate: "",
  isBirthUnknown: false,
  weight: "",
  checkupDate: "",
  isCheckupUnknown: false,
  notes: "",
};

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const selectClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const errorInputClass = "border-red-400 focus:border-red-500 focus:ring-red-100";
const labelClass = "text-sm font-black text-slate-800";

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="mt-1 text-[10px] font-semibold text-red-500">{message}</p> : null;

const RequiredMark = () => <span className="ml-0.5 text-red-500">*</span>;

const getRandomDefaultProfileImage = () => {
  const randomIndex = Math.floor(Math.random() * defaultProfileImages.length);
  return defaultProfileImages[randomIndex];
};

const normalizeDate = (date?: string) => date?.slice(0, 10) || "";

const normalizeGender = (gender?: string) => {
  if (gender === "male" || gender === "남아") {
    return "수컷";
  }

  if (gender === "female" || gender === "여아") {
    return "암컷";
  }

  return genderOptions.includes(gender || "") ? gender || "" : "";
};

const normalizeNeutered = (isNeutered?: string) =>
  neuteredOptions.includes(isNeutered || "") ? isNeutered || "" : "";

const getFormFromPet = (pet: Pet): FormState => {
  const isKnownSpecies = speciesOptions.includes(pet.species || "");

  return {
    petname: pet.petname || "",
    species: isKnownSpecies ? pet.species || "" : pet.species ? "기타" : "",
    customSpecies: isKnownSpecies ? "" : pet.species || "",
    breed: pet.breed || "",
    gender: normalizeGender(pet.gender),
    isNeutered: normalizeNeutered(pet.is_neutered),
    birthDate: normalizeDate(pet.birth_date),
    isBirthUnknown: Boolean(pet.is_birth_unknown),
    weight: pet.weight ? String(pet.weight) : "",
    checkupDate: normalizeDate(pet.checkup_date),
    isCheckupUnknown: Boolean(pet.is_checkup_unknown),
    notes: pet.notes || "",
  };
};

const getPayloadFromForm = (
  formState: FormState,
  profileImage?: string,
): PetPayload => ({
  petname: formState.petname.trim(),
  species:
    formState.species === "기타"
      ? formState.customSpecies.trim()
      : formState.species,
  breed: formState.breed.trim(),
  gender: formState.gender,
  is_neutered: formState.isNeutered,
  birth_date:
    !formState.isBirthUnknown && formState.birthDate ? formState.birthDate : "",
  is_birth_unknown: formState.isBirthUnknown,
  weight: Number(formState.weight),
  checkup_date:
    !formState.isCheckupUnknown && formState.checkupDate
      ? formState.checkupDate
      : "",
  is_checkup_unknown: formState.isCheckupUnknown,
  notes: formState.notes.trim(),
  ...(profileImage ? { profile_image: profileImage } : {}),
});

const getChangedPayload = (
  currentPayload: PetPayload,
  originalPayload: PetPayload,
) =>
  (Object.keys(currentPayload) as Array<keyof PetPayload>).reduce<
    Partial<CreatePetPayload>
  >((changedPayload, key) => {
    if (currentPayload[key] !== originalPayload[key]) {
      return { ...changedPayload, [key]: currentPayload[key] };
    }

    return changedPayload;
  }, {});

const PawIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M8.4 9.9c1.1 0 1.9-1.3 1.9-2.9S9.5 4.1 8.4 4.1 6.5 5.4 6.5 7s.8 2.9 1.9 2.9Zm7.2 0c1.1 0 1.9-1.3 1.9-2.9s-.8-2.9-1.9-2.9-1.9 1.3-1.9 2.9.8 2.9 1.9 2.9ZM5.4 13.2c.9-.3 1.2-1.8.7-3.2-.5-1.5-1.7-2.4-2.6-2.1-.9.3-1.2 1.8-.7 3.2.5 1.5 1.7 2.4 2.6 2.1Zm13.2 0c.9.3 2.1-.6 2.6-2.1.5-1.4.2-2.9-.7-3.2-.9-.3-2.1.6-2.6 2.1-.5 1.4-.2 2.9.7 3.2ZM12 11.3c-3.2 0-5.8 2.4-5.8 5.2 0 1.8 1.5 3.1 3.2 3.1 1 0 1.7-.4 2.6-.4s1.6.4 2.6.4c1.7 0 3.2-1.3 3.2-3.1 0-2.8-2.6-5.2-5.8-5.2Z" />
  </svg>
);

const CameraIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M4 8h3l1.5-2h7L17 8h3v10H4V8Z" />
    <path d="M9 13a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z" />
  </svg>
);

const choiceTone = {
  blue: "border-blue-300 bg-blue-50 text-blue-700",
  pink: "border-pink-300 bg-pink-50 text-pink-700",
  green: "border-emerald-300 bg-emerald-50 text-emerald-700",
  orange: "border-orange-300 bg-orange-50 text-orange-700",
  purple: "border-indigo-300 bg-indigo-50 text-indigo-700",
  slate: "border-slate-300 bg-slate-50 text-slate-700",
};

const getChoiceClass = (
  isSelected: boolean,
  tone: keyof typeof choiceTone = "slate",
) =>
  [
    "flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-black transition",
    isSelected
      ? choiceTone[tone]
      : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/60",
  ].join(" ");

const PetRegisterPage = () => {
  const navigate = useNavigate();
  const editRouteMatch = useMatch("/pets/:petId/edit");
  const { petId } = useParams();
  const isEditRoute = Boolean(editRouteMatch);
  const parsedPetId = petId ? Number(petId) : NaN;
  const isValidEditPetId =
    isEditRoute && Number.isFinite(parsedPetId) && parsedPetId > 0;
  const editPetId = isValidEditPetId ? parsedPetId : undefined;
  const isEditMode = isEditRoute && isValidEditPetId;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const customSpeciesInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [originalForm, setOriginalForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [previewUrl, setPreviewUrl] = useState("");
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [loadMessage, setLoadMessage] = useState(
    isEditRoute && !isValidEditPetId ? "잘못된 접근입니다." : "",
  );
  const [isLoading, setIsLoading] = useState(Boolean(isEditMode));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEditRoute && !isValidEditPetId) {
      setForm(initialForm);
      setOriginalForm(null);
      setPreviewUrl("");
      setOriginalPreviewUrl("");
      setLoadMessage("잘못된 접근입니다.");
      setIsLoading(false);
      return;
    }

    if (!isEditRoute) {
      setForm(initialForm);
      setOriginalForm(null);
      setPreviewUrl("");
      setOriginalPreviewUrl("");
      setLoadMessage("");
      setIsLoading(false);
      return;
    }

    if (!editPetId) {
      return;
    }

    let isMounted = true;

    const loadPet = async () => {
      try {
        setIsLoading(true);
        setLoadMessage("");

        const response = await getPet(editPetId);
        if (!isMounted) {
          return;
        }

        if (response.code !== 200) {
          setLoadMessage(response.message || "반려동물 정보를 불러오지 못했습니다.");
          return;
        }

        const loadedForm = getFormFromPet(response.result);
        const loadedProfileImage = response.result.profile_image || "";

        setForm(loadedForm);
        setOriginalForm(loadedForm);
        setPreviewUrl(loadedProfileImage);
        setOriginalPreviewUrl(loadedProfileImage);
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
  }, [editPetId, isEditRoute, isValidEditPetId]);

  const closeModal = () => {
    navigate("/home");
  };

  const updateForm = <Key extends keyof FormState>(
    key: Key,
    value: FormState[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));

    if (errors[key]) {
      setErrors((current) => ({ ...current, [key]: undefined }));
    }
  };

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateForm("petname", event.target.value.slice(0, 15));
  };

  const handleNotesChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    updateForm("notes", event.target.value.slice(0, maxNotesLength));
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
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

  const validateForm = () => {
    const nextErrors: FormErrors = {};

    if (!form.petname.trim()) {
      nextErrors.petname = "반려동물 이름을 입력해주세요.";
    }

    if (!form.species) {
      nextErrors.species = "종을 선택해주세요.";
    }

    if (form.species === "기타" && !form.customSpecies.trim()) {
      nextErrors.customSpecies = "종 정보를 입력해주세요.";
    }

    if (!form.gender) {
      nextErrors.gender = "성별을 선택해주세요.";
    }

    if (!form.isNeutered) {
      nextErrors.isNeutered = "중성화 여부를 선택해주세요.";
    }

    if (!form.weight.trim()) {
      nextErrors.weight = "몸무게를 입력해주세요.";
    } else if (Number.isNaN(Number(form.weight)) || Number(form.weight) <= 0) {
      nextErrors.weight = "몸무게를 올바르게 입력해주세요.";
    }

    setErrors(nextErrors);

    if (nextErrors.customSpecies) {
      window.setTimeout(() => customSpeciesInputRef.current?.focus(), 0);
    }

    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = (): CreatePetPayload => {
    const payload = getPayloadFromForm(form);

    if (!previewUrl) {
      payload.profile_image = getRandomDefaultProfileImage();
    } else {
      payload.profile_image = previewUrl;
    }

    return payload;
  };

  const buildUpdatePayload = (): Partial<CreatePetPayload> => {
    if (!originalForm) {
      return getPayloadFromForm(form, previewUrl);
    }

    const originalPayload = getPayloadFromForm(originalForm, originalPreviewUrl);
    const currentPayload = getPayloadFromForm(form, previewUrl);

    return getChangedPayload(currentPayload, originalPayload);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitMessage("");

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
        isEditMode && editPetId
          ? await updatePet(editPetId, updatePayload || {})
          : await createPet(buildPayload());

      if (isEditMode) {
        petIdToRefresh = editPetId;
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
            <h1 className="text-2xl font-black text-slate-950">
              {isEditRoute ? "반려동물 수정하기" : "반려동물 등록하기"}
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              반려동물 정보를 입력해주세요.
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
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">대표 사진</h2>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative mt-5 flex h-72 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-violet-200 bg-gradient-to-b from-violet-50 to-white text-center transition hover:border-violet-300 hover:bg-violet-50"
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="대표 사진 미리보기"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <>
                    <span className="absolute left-6 top-6 text-4xl text-violet-100">
                      ♡
                    </span>
                    <span className="absolute bottom-7 right-7 text-4xl text-violet-100">
                      <PawIcon className="h-9 w-9" />
                    </span>
                    <span className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                      <CameraIcon />
                    </span>
                    <span className="mt-6 text-base font-black text-slate-800">
                      사진을 업로드해주세요
                    </span>
                    <span className="mt-2 text-sm font-semibold text-slate-500">
                      JPG, PNG 최대 5MB
                    </span>
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleImageChange}
                className="hidden"
              />
              <FieldError message={errors.profileImage} />
            </section>

            <section className="relative overflow-hidden rounded-2xl bg-violet-50 p-6 ring-1 ring-violet-100">
              <div className="flex items-center gap-2 text-violet-700">
                <PawIcon className="h-5 w-5" />
                <h2 className="text-lg font-black">안내사항</h2>
              </div>
              <ul className="mt-6 space-y-4 pr-6 text-sm font-semibold leading-6 text-slate-700">
                <li>입력하지 않은 항목은 나중에 반려동물 관리에서 수정할 수 있습니다.</li>
                <li>정확한 정보는 AI 상담과 진료 예약 정확도 향상에 도움이 됩니다.</li>
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
            <section className="p-6">
              <div className="mb-5 flex items-center gap-2 text-violet-700">
                <PawIcon className="h-5 w-5" />
                <h2 className="text-lg font-black">기본 정보</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="petname" className={labelClass}>
                    이름
                    <RequiredMark />
                  </label>
                  <input
                    id="petname"
                    value={form.petname}
                    onChange={handleNameChange}
                    placeholder="예시) 몽몽이"
                    className={`${inputClass} mt-2 ${
                      errors.petname ? errorInputClass : ""
                    }`}
                  />
                  <FieldError message={errors.petname} />
                </div>

                <div>
                  <label htmlFor="gender" className={labelClass}>
                    성별
                    <RequiredMark />
                  </label>
                  <select
                    id="gender"
                    value={form.gender}
                    onChange={(event) => updateForm("gender", event.target.value)}
                    className={`${selectClass} mt-2 ${
                      errors.gender ? errorInputClass : ""
                    }`}
                  >
                    <option value="">선택해주세요</option>
                    {genderOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <FieldError message={errors.gender} />
                </div>

                <div>
                  <label htmlFor="weight" className={labelClass}>
                    몸무게
                    <RequiredMark />
                  </label>
                  <div className="relative mt-2">
                    <input
                      id="weight"
                      type="number"
                      min="0"
                      step="0.1"
                      value={form.weight}
                      onChange={(event) => updateForm("weight", event.target.value)}
                      placeholder="예) 4.2"
                      className={`${inputClass} pr-12 ${
                        errors.weight ? errorInputClass : ""
                      }`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">
                      kg
                    </span>
                  </div>
                  <FieldError message={errors.weight} />
                </div>

                <div>
                  <label htmlFor="is-neutered" className={labelClass}>
                    중성화 여부
                    <RequiredMark />
                  </label>
                  <select
                    id="is-neutered"
                    value={form.isNeutered}
                    onChange={(event) =>
                      updateForm("isNeutered", event.target.value)
                    }
                    className={`${selectClass} mt-2 ${
                      errors.isNeutered ? errorInputClass : ""
                    }`}
                  >
                    <option value="">선택해주세요</option>
                    {neuteredOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <FieldError message={errors.isNeutered} />
                </div>
              </div>
            </section>

            <section className="border-t border-slate-100 p-6">
              <div className="mb-5 flex items-center gap-2 text-violet-700">
                <PawIcon className="h-5 w-5" />
                <h2 className="text-lg font-black">종류</h2>
              </div>

              <div>
                <label className={labelClass}>
                  종
                  <RequiredMark />
                </label>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  {speciesOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        updateForm("species", option);
                        if (option !== "기타") {
                          updateForm("customSpecies", "");
                        }
                      }}
                      className={getChoiceClass(
                        form.species === option,
                        option === "기타" ? "purple" : "slate",
                      )}
                    >
                      <span>
                        {option === "강아지"
                          ? "🐶"
                          : option === "고양이"
                            ? "🐱"
                            : "+"}
                      </span>
                      {option}
                    </button>
                  ))}
                </div>
                <FieldError message={errors.species} />
              </div>

              <div className="mt-4">
                <input
                  ref={customSpeciesInputRef}
                  value={form.customSpecies}
                  disabled={form.species !== "기타"}
                  onChange={(event) =>
                    updateForm("customSpecies", event.target.value)
                  }
                  placeholder="직접 입력해주세요. 예: 카피바라"
                  className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400 ${
                    errors.customSpecies ? errorInputClass : ""
                  }`}
                />
                <FieldError message={errors.customSpecies} />
              </div>

              <div className="mt-4">
                <label htmlFor="breed" className={labelClass}>
                  품종 (선택)
                </label>
                <input
                  id="breed"
                  value={form.breed}
                  onChange={(event) => updateForm("breed", event.target.value)}
                  placeholder="예) 말티즈, 코리안숏헤어 등"
                  className={`${inputClass} mt-2`}
                />
              </div>
            </section>

            <section className="border-t border-slate-100 p-6">
              <div className="mb-5 flex items-center gap-2 text-violet-700">
                <PawIcon className="h-5 w-5" />
                <h2 className="text-lg font-black">건강 정보</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="birth-date" className={labelClass}>
                    생년월일
                  </label>
                  <input
                    id="birth-date"
                    type="date"
                    value={form.birthDate}
                    disabled={form.isBirthUnknown}
                    onChange={(event) => updateForm("birthDate", event.target.value)}
                    className={`${inputClass} mt-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:placeholder:text-slate-400`}
                  />
                  <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={form.isBirthUnknown}
                      onChange={(event) => {
                        updateForm("isBirthUnknown", event.target.checked);
                        if (event.target.checked) {
                          updateForm("birthDate", "");
                        }
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    날짜를 모르겠어요
                  </label>
                </div>

                <div>
                  <label htmlFor="checkup-date" className={labelClass}>
                    마지막 정기검진
                  </label>
                  <input
                    id="checkup-date"
                    type="date"
                    value={form.checkupDate}
                    disabled={form.isCheckupUnknown}
                    onChange={(event) =>
                      updateForm("checkupDate", event.target.value)
                    }
                    className={`${inputClass} mt-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:placeholder:text-slate-400`}
                  />
                  <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={form.isCheckupUnknown}
                      onChange={(event) => {
                        updateForm("isCheckupUnknown", event.target.checked);
                        if (event.target.checked) {
                          updateForm("checkupDate", "");
                        }
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    검진 날짜를 모르겠어요
                  </label>
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="notes" className={labelClass}>
                      특이사항 (선택)
                    </label>
                  </div>
                  <div className="relative mt-2">
                    <textarea
                      id="notes"
                      value={form.notes}
                      onChange={handleNotesChange}
                      placeholder="알레르기, 질병 이력, 성격 등 간단히 입력해주세요."
                      className="h-[88px] w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 pb-7 text-sm font-semibold leading-5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    />
                    <span className="absolute bottom-3 right-4 text-xs font-bold text-slate-400">
                      {form.notes.length} / {maxNotesLength}
                    </span>
                  </div>
                </div>
              </div>
            </section>

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
                취소
              </button>
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
            </footer>
          </form>
        </div>
        )}
      </main>
    </div>
  );
};

export default PetRegisterPage;
