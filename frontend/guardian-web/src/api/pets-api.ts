import { apiClient } from "./api-client";

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

export interface PetResponse {
  code: number;
  message?: string;
  result: Pet;
}

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

export interface UpdatePetResponse {
  code: number;
  message: string;
}

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
  const response = await apiClient.get<PetsResponse>("/pets");
  return normalizePetsResponse(response.data);
};

export const getPet = async (petId: number): Promise<PetResponse> => {
  const response = await apiClient.get<PetResponse>(`/pets/${petId}`);
  return normalizePetsResponse(response.data);
};

export const createPet = async (
  payload: CreatePetPayload,
): Promise<CreatePetResponse> => {
  const response = await apiClient.post<CreatePetResponse>("/pets", payload);
  return response.data;
};

export const updatePet = async (
  petId: number,
  payload: Partial<CreatePetPayload>,
): Promise<UpdatePetResponse> => {
  // TODO: Replace base64 profile_image payloads with the production upload flow:
  // FastAPI presigned URL issuance -> direct S3 upload -> CloudFront URL persistence.
  const response = await apiClient.put<UpdatePetResponse>(
    `/pets/${petId}`,
    payload,
  );
  return response.data;
};
