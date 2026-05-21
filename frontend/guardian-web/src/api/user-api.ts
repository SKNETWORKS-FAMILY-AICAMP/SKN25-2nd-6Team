import { apiClient } from "./api-client";
import { useAuthStore } from "../stores/auth-store";

export interface MyProfile {
  name: string;
  phone: string;
  created_at: string;
}

export interface MyProfileResponse {
  code: number;
  message?: string;
  result: MyProfile;
}

export interface UpdateMyProfileRequest {
  name: string;
  phone: string;
}

export interface UpdateMyProfileResponse {
  code: number;
  message: string;
}

export interface ChangeMyPasswordRequest {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
}

export interface ChangeMyPasswordResponse {
  code: number;
  message: string;
}

const demoGuardianLoginId = "guardian-demo";
const demoProfileStorageKey = "medipaw-guardian-demo-profile";

const demoProfile: MyProfile = {
  name: "개발용 보호자",
  phone: "010-1234-5678",
  created_at: "2024.02.15",
};

const isDemoGuardian = () =>
  import.meta.env.DEV &&
  useAuthStore.getState().guardian?.loginid === demoGuardianLoginId;

const readDemoProfile = () => {
  const storedProfile = window.localStorage.getItem(demoProfileStorageKey);

  if (!storedProfile) {
    window.localStorage.setItem(
      demoProfileStorageKey,
      JSON.stringify(demoProfile),
    );
    return demoProfile;
  }

  try {
    return JSON.parse(storedProfile) as MyProfile;
  } catch {
    window.localStorage.setItem(
      demoProfileStorageKey,
      JSON.stringify(demoProfile),
    );
    return demoProfile;
  }
};

const writeDemoProfile = (profile: MyProfile) => {
  window.localStorage.setItem(demoProfileStorageKey, JSON.stringify(profile));
};

export const getMyProfile = async (): Promise<MyProfileResponse> => {
  if (isDemoGuardian()) {
    return {
      code: 200,
      message: "데모 회원 정보를 불러왔습니다.",
      result: readDemoProfile(),
    };
  }

  const response = await apiClient.get<MyProfileResponse>("/users/me");
  return response.data;
};

export const updateMyProfile = async (
  data: UpdateMyProfileRequest,
): Promise<UpdateMyProfileResponse> => {
  if (isDemoGuardian()) {
    const currentProfile = readDemoProfile();
    writeDemoProfile({
      ...currentProfile,
      name: data.name,
      phone: data.phone,
    });

    return {
      code: 200,
      message: "회원 정보가 수정되었습니다.",
    };
  }

  const response = await apiClient.put<UpdateMyProfileResponse>(
    "/users/me",
    data,
  );
  return response.data;
};

export const changeMyPassword = async (
  data: ChangeMyPasswordRequest,
): Promise<ChangeMyPasswordResponse> => {
  if (isDemoGuardian()) {
    if (data.new_password !== data.new_password_confirm) {
      return {
        code: 400,
        message: "새 비밀번호가 일치하지 않습니다.",
      };
    }

    return {
      code: 200,
      message: "비밀번호가 변경되었습니다.",
    };
  }

  const response = await apiClient.put<ChangeMyPasswordResponse>(
    "/users/me/password",
    data,
  );
  return response.data;
};
