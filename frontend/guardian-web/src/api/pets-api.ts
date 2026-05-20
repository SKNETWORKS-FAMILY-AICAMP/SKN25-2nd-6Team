import { apiClient } from "./api-client";
import { useAuthStore } from "../stores/auth-store";

export interface Pet {
  pet_id: number;
  petname: string;
  species?: string;
  breed?: string;
  gender?: string;
  is_neutered?: string;
  age?: number;
  birth_date?: string;
  is_birth_unknown?: boolean;
  weight_kg?: number;
  checkup_date?: string;
  is_checkup_unknown?: boolean;
  notes?: string;
  profile_image?: string;
}

export interface PetsResponse {
  code: number;
  message?: string;
  result: Pet[];
}

const demoPetsStorageKey = "medipaw-guardian-demo-pets";
const demoGuardianLoginId = "guardian-demo";

const demoPets: Pet[] = [
  {
    pet_id: 101,
    petname: "몽몽이",
    species: "강아지",
    breed: "말티즈",
    gender: "수컷",
    is_neutered: "예",
    age: 4,
    birth_date: "2021-03-12",
    is_birth_unknown: false,
    weight_kg: 4.2,
    checkup_date: "2026-03-20",
    is_checkup_unknown: false,
    notes: "피부가 예민해서 간식 변경 시 알레르기 반응을 확인해주세요.",
    profile_image: "/assets/profile1.png",
  },
  {
    pet_id: 102,
    petname: "두부",
    species: "고양이",
    breed: "코리안숏헤어",
    gender: "암컷",
    is_neutered: "예",
    age: 3,
    birth_date: "2022-08-04",
    is_birth_unknown: false,
    weight_kg: 3.8,
    checkup_date: "2026-02-14",
    is_checkup_unknown: false,
    notes: "낯선 환경에서 긴장하는 편이라 이동장 적응 시간이 필요합니다.",
    profile_image: "/assets/profile2.png",
  },
  {
    pet_id: 103,
    petname: "콩이",
    species: "강아지",
    breed: "푸들",
    gender: "암컷",
    is_neutered: "아니오",
    age: 1,
    birth_date: "2024-11-18",
    is_birth_unknown: false,
    weight_kg: 2.9,
    checkup_date: "",
    is_checkup_unknown: true,
    notes: "예방접종 일정 확인이 필요합니다.",
    profile_image: "/assets/profile3.png",
  },
];

const isDemoGuardian = () =>
  import.meta.env.DEV &&
  useAuthStore.getState().guardian?.loginid === demoGuardianLoginId;

const readDemoPets = () => {
  const storedPets = window.localStorage.getItem(demoPetsStorageKey);

  if (!storedPets) {
    window.localStorage.setItem(demoPetsStorageKey, JSON.stringify(demoPets));
    return demoPets;
  }

  try {
    return JSON.parse(storedPets) as Pet[];
  } catch {
    window.localStorage.setItem(demoPetsStorageKey, JSON.stringify(demoPets));
    return demoPets;
  }
};

const writeDemoPets = (pets: Pet[]) => {
  window.localStorage.setItem(demoPetsStorageKey, JSON.stringify(pets));
};

const normalizePet = (pet: Pet): Pet => ({
  ...pet,
});

const normalizePetsResponse = <Response extends { result: Pet | Pet[] }>(
  response: Response,
): Response => ({
  ...response,
  result: Array.isArray(response.result)
    ? response.result.map(normalizePet)
    : normalizePet(response.result),
});

export const getPets = async (): Promise<PetsResponse> => {
  if (isDemoGuardian()) {
    return {
      code: 200,
      message: "데모 반려동물 목록을 불러왔습니다.",
      result: readDemoPets().map(normalizePet),
    };
  }

  const response = await apiClient.get<PetsResponse>("/pets");
  return normalizePetsResponse(response.data);
};

export interface PetResponse {
  code: number;
  message?: string;
  result: Pet;
}

export const getPet = async (petId: number): Promise<PetResponse> => {
  if (isDemoGuardian()) {
    const pet = readDemoPets().find((demoPet) => demoPet.pet_id === petId);

    return {
      code: pet ? 200 : 404,
      message: pet
        ? "데모 반려동물 정보를 불러왔습니다."
        : "반려동물 정보를 찾을 수 없습니다.",
      result: normalizePet(pet || demoPets[0]),
    };
  }

  const response = await apiClient.get<PetResponse>(`/pets/${petId}`);
  return normalizePetsResponse(response.data);
};

export interface CreatePetPayload {
  petname: string;
  species: string;
  breed?: string;
  gender: string;
  is_neutered: string;
  birth_date?: string;
  is_birth_unknown?: boolean;
  weight_kg: number;
  checkup_date?: string;
  is_checkup_unknown?: boolean;
  notes?: string;
  profile_image?: string;
}

export interface CreatePetResponse {
  code: number;
  message: string;
  result?: {
    pet_id: number;
  };
}

export const createPet = async (
  payload: CreatePetPayload,
): Promise<CreatePetResponse> => {
  if (isDemoGuardian()) {
    const pets = readDemoPets();
    const nextPetId =
      pets.reduce((maxPetId, pet) => Math.max(maxPetId, pet.pet_id), 100) + 1;

    writeDemoPets([
      ...pets,
      {
        pet_id: nextPetId,
        ...payload,
      },
    ]);

    return {
      code: 201,
      message: "데모 반려동물이 등록되었습니다.",
      result: {
        pet_id: nextPetId,
      },
    };
  }

  const response = await apiClient.post<CreatePetResponse>("/pets", payload);
  return response.data;
};

export interface UpdatePetResponse {
  code: number;
  message: string;
}

export const updatePet = async (
  petId: number,
  payload: Partial<CreatePetPayload>,
): Promise<UpdatePetResponse> => {
  if (isDemoGuardian()) {
    const pets = readDemoPets();
    const targetPet = pets.find((pet) => pet.pet_id === petId);

    if (!targetPet) {
      return {
        code: 404,
        message: "반려동물 정보를 찾을 수 없습니다.",
      };
    }

    writeDemoPets(
      pets.map((pet) =>
        pet.pet_id === petId
          ? {
              ...pet,
              ...payload,
            }
          : pet,
      ),
    );

    return {
      code: 200,
      message: "반려동물 정보가 수정되었습니다.",
    };
  }

  // TODO: Replace base64 profile_image payloads with the production upload flow:
  // FastAPI presigned URL issuance -> direct S3 upload -> CloudFront URL persistence.
  const response = await apiClient.put<UpdatePetResponse>(
    `/pets/${petId}`,
    payload,
  );
  return response.data;
};
