import { apiClient } from "./api-client";

export interface SignupRequest {
  loginid: string;
  password: string;
  name: string;
  phone: string;
}

export interface SignupResponse {
  code: number;
  message: string;
}

export const signupGuardian = async (
  data: SignupRequest,
): Promise<SignupResponse> => {
  const response = await apiClient.post<SignupResponse>("/auth/signup", data);
  return response.data;
};
