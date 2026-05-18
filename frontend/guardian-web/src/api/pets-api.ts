import { apiClient } from "./api-client";

export interface Pet {
  pet_id: number;
  petname: string;
  species?: string;
  breed?: string;
  gender?: string;
  is_neuterd?: string;
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
