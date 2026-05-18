import { apiClient } from "./api-client";

export interface Pet {
  pet_id: number;
  petname: string;
  species?: string;
  breed?: string;
  gender?: string;
  is_neutered?: string;
  age?: number;
  profile_image?: string;
}

export interface PetsResponse {
  code: number;
  message?: string;
  result: Pet[];
}

export const getPets = async (): Promise<PetsResponse> => {
  const response = await apiClient.get<PetsResponse>("/pets");
  return response.data;
};

export interface CreatePetPayload {
  petname: string;
  species: string;
  breed?: string;
  gender: string;
  is_neutered: string;
  birth_date?: string;
  is_birth_unknown?: boolean;
  weight: number;
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
  const response = await apiClient.post<CreatePetResponse>("/pets", payload);
  return response.data;
};
