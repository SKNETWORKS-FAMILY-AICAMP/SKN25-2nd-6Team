import {
  type ChangeEvent,
  type RefObject,
  useCallback,
  useState,
} from "react";

import {
  type CreatePetPayload,
  type Pet,
} from "../api/pets-api";

export const speciesOptions = ["강아지", "고양이", "기타"];
export const genderOptions = ["수컷", "암컷", "모름"];
export const neuteredOptions = ["예", "아니오", "모름"];
export const maxNotesLength = 200;

const defaultProfileImages = [
  "/assets/profile1.png",
  "/assets/profile2.png",
  "/assets/profile3.png",
  "/assets/profile4.png",
  "/assets/profile5.png",
  "/assets/profile6.png",
];

export interface PetFormState {
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

export type PetFormErrors = Partial<
  Record<keyof PetFormState | "profileImage", string>
>;

type PetPayload = CreatePetPayload & {
  breed?: string;
  birth_date?: string;
  checkup_date?: string;
  notes?: string;
};

const initialForm: PetFormState = {
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

export const getFormFromPet = (pet: Pet): PetFormState => {
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
    weight: pet.weight_kg ? String(pet.weight_kg) : "",
    checkupDate: normalizeDate(pet.checkup_date),
    isCheckupUnknown: Boolean(pet.is_checkup_unknown),
    notes: pet.notes || "",
  };
};

export const getPayloadFromForm = (
  formState: PetFormState,
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
    !formState.isBirthUnknown && formState.birthDate
      ? formState.birthDate
      : undefined,
  is_birth_unknown: formState.isBirthUnknown,
  weight_kg: Number(formState.weight),
  checkup_date:
    !formState.isCheckupUnknown && formState.checkupDate
      ? formState.checkupDate
      : undefined,
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

interface UsePetFormParams {
  customSpeciesInputRef: RefObject<HTMLInputElement>;
}

export const usePetForm = ({ customSpeciesInputRef }: UsePetFormParams) => {
  const [form, setForm] = useState<PetFormState>(initialForm);
  const [originalForm, setOriginalForm] = useState<PetFormState | null>(null);
  const [errors, setErrors] = useState<PetFormErrors>({});
  const [previewUrl, setPreviewUrl] = useState("");
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState("");

  const resetPetFormState = useCallback(() => {
    setForm(initialForm);
    setOriginalForm(null);
    setPreviewUrl("");
    setOriginalPreviewUrl("");
  }, []);

  const applyPetToForm = useCallback((pet: Pet) => {
    const loadedForm = getFormFromPet(pet);
    const loadedProfileImage = pet.profile_image || "";

    setForm(loadedForm);
    setOriginalForm(loadedForm);
    setPreviewUrl(loadedProfileImage);
    setOriginalPreviewUrl(loadedProfileImage);
  }, []);

  const updateForm = <Key extends keyof PetFormState>(
    key: Key,
    value: PetFormState[Key],
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

  const validateForm = () => {
    const nextErrors: PetFormErrors = {};

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

  return {
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
  };
};
