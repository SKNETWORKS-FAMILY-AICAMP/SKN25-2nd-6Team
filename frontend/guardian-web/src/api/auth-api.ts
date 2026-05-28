import { apiClient } from "./api-client";

export interface SignupRequest {
  loginid: string;
  password: string;
  password_confirm: string;
  name: string;
  phone: string;
}

export interface SignupResponse {
  code: number;
  message: string;
}

export interface LoginRequest {
  loginid: string;
  password: string;
  keep_login?: boolean;
}

export interface LoginResponse {
  code: number;
  message: string;
  result?: {
    access_token: string;
    refresh_token: string;
  };
}

export interface RefreshTokenResponse {
  code: number;
  message: string;
  result?: {
    access_token: string;
  };
}

export interface FindIdRequest {
  name: string;
  phone: string;
}

export interface FindIdResponse {
  code: number;
  message: string;
  result?: {
    loginid: string;
  };
}

export interface FindPasswordRequest {
  loginid: string;
  name: string;
  phone: string;
}

export interface FindPasswordResponse {
  code: number;
  message: string;
  result?: {
    temp_password: string;
  };
}

export const signupGuardian = async (
  data: SignupRequest,
): Promise<SignupResponse> => {
  const response = await apiClient.post<SignupResponse>("/auth/signup", data);
  return response.data;
};

export const loginGuardian = async (
  data: LoginRequest,
): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>("/auth/login", data);
  return response.data;
};

export const refreshGuardianToken = async (
  refreshToken: string,
): Promise<RefreshTokenResponse> => {
  const response = await apiClient.post<RefreshTokenResponse>(
    "/auth/refresh",
    undefined,
    {
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    },
  );
  return response.data;
};

export const findGuardianId = async (
  data: FindIdRequest,
): Promise<FindIdResponse> => {
  const response = await apiClient.post<FindIdResponse>("/auth/find-id", data);
  return response.data;
};

export const findGuardianPassword = async (
  data: FindPasswordRequest,
): Promise<FindPasswordResponse> => {
  const response = await apiClient.post<FindPasswordResponse>(
    "/auth/find-password",
    data,
  );
  return response.data;
};
