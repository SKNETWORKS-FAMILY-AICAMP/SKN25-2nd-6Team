import axios, { AxiosError } from "axios";
import { API_BASE_URL, apiClient } from "./client";

export interface HospitalUser {
  id: string;
  name: string;
  hospitalName: string;
  role: "HOSPITAL_ADMIN" | "VETERINARIAN";
  isFirstLogin: boolean;
}

export interface AuthSession {
  accessToken: string;
  user: HospitalUser;
  lastLoginAt?: string;
}

interface LoginResponse {
  code?: number;
  message?: string;
  access_token?: string;
  accessToken?: string;
  token?: string;
  data?: {
    access_token?: string;
    accessToken?: string;
    token?: string;
    user?: LoginResponse["user"];
    loginid?: string;
    id?: string;
    name?: string;
    hospital_name?: string;
    hospitalName?: string;
    role?: HospitalUser["role"];
    is_first_login?: boolean;
    isFirstLogin?: boolean;
    first_login?: boolean;
    firstLogin?: boolean;
    password_change_required?: boolean;
    passwordChangeRequired?: boolean;
    must_change_password?: boolean;
    mustChangePassword?: boolean;
    password_changed?: boolean;
    passwordChanged?: boolean;
  };
  user?: {
    loginid?: string;
    id?: string;
    name?: string;
    hospital_name?: string;
    hospitalName?: string;
    role?: HospitalUser["role"];
    is_first_login?: boolean;
    isFirstLogin?: boolean;
    first_login?: boolean;
    firstLogin?: boolean;
    password_change_required?: boolean;
    passwordChangeRequired?: boolean;
    must_change_password?: boolean;
    mustChangePassword?: boolean;
    password_changed?: boolean;
    passwordChanged?: boolean;
  };
  loginid?: string;
  name?: string;
  hospital_name?: string;
  role?: HospitalUser["role"];
  is_first_login?: boolean;
  isFirstLogin?: boolean;
  first_login?: boolean;
  firstLogin?: boolean;
  password_change_required?: boolean;
  passwordChangeRequired?: boolean;
  must_change_password?: boolean;
  mustChangePassword?: boolean;
  password_changed?: boolean;
  passwordChanged?: boolean;
}

interface PasswordChangeResponse {
  code: number;
  message: string;
}

const SESSION_STORAGE_KEY = "medipaw_vet_session";
const PASSWORD_CHANGED_USERS_STORAGE_KEY = "medipaw_vet_password_changed_users";

export async function changePassword(params: {
  accessToken: string;
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}) {
  try {
    const { data } = await apiClient.put<PasswordChangeResponse>(
      "/doctor/auth/password/change",
      {
        current_password: params.currentPassword,
        new_password: params.newPassword,
        new_password_confirm: params.newPasswordConfirm,
      },
      {
        headers: { Authorization: `Bearer ${params.accessToken}` },
      }
    );

    if (data.code !== 200) {
      throw new Error(data.message ?? "비밀번호 변경에 실패했습니다.");
    }
  } catch (err) {
    throw new Error(
      getApiErrorMessage(err, "비밀번호 변경 중 오류가 발생했습니다.")
    );
  }
}

export function getSavedSession(): AuthSession | null {
  const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);

  if (!savedSession) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(savedSession) as AuthSession;

    if (hasChangedPassword(parsedSession.user.id)) {
      return {
        ...parsedSession,
        user: {
          ...parsedSession.user,
          isFirstLogin: false,
        },
      };
    }

    return parsedSession;
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function saveSession(session: AuthSession) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export async function loginDoctor(loginid: string, password: string) {
  try {
    const { data } = await apiClient.post<LoginResponse>("/doctor/auth/login", {
      loginid,
      password,
    });

    if (data.code && data.code !== 200) {
      throw new Error(data.message ?? "로그인에 실패했습니다.");
    }

    const accessToken =
      data.access_token ??
      data.accessToken ??
      data.token ??
      data.data?.access_token ??
      data.data?.accessToken ??
      data.data?.token;

    if (!accessToken) {
      throw new Error("로그인 응답에서 인증 토큰을 찾을 수 없습니다.");
    }

    const responseUser = data.user ?? data.data?.user;
    const session: AuthSession = {
      accessToken,
      lastLoginAt: new Date().toISOString(),
      user: {
        id:
          responseUser?.loginid ??
          responseUser?.id ??
          data.data?.loginid ??
          data.data?.id ??
          data.loginid ??
          loginid,
        name: responseUser?.name ?? data.data?.name ?? data.name ?? "수의사 관리자",
        hospitalName:
          responseUser?.hospital_name ??
          responseUser?.hospitalName ??
          data.data?.hospital_name ??
          data.data?.hospitalName ??
          data.hospital_name ??
          "MediPaw 동물병원",
        role: responseUser?.role ?? data.data?.role ?? data.role ?? "VETERINARIAN",
        isFirstLogin: getIsFirstLogin(data, responseUser),
      },
    };

    if (hasChangedPassword(session.user.id)) {
      session.user.isFirstLogin = false;
    }

    saveSession(session);

    return session;
  } catch (err) {
    throw new Error(getApiErrorMessage(err, "로그인 중 오류가 발생했습니다."));
  }
}

function getIsFirstLogin(
  data: LoginResponse,
  user?: LoginResponse["user"]
) {
  const explicitFirstLogin =
    parseBoolean(user?.is_first_login) ??
    parseBoolean(user?.isFirstLogin) ??
    parseBoolean(user?.first_login) ??
    parseBoolean(user?.firstLogin) ??
    parseBoolean(data.data?.is_first_login) ??
    parseBoolean(data.data?.isFirstLogin) ??
    parseBoolean(data.data?.first_login) ??
    parseBoolean(data.data?.firstLogin) ??
    parseBoolean(data.is_first_login) ??
    parseBoolean(data.isFirstLogin) ??
    parseBoolean(data.first_login) ??
    parseBoolean(data.firstLogin);

  if (explicitFirstLogin !== undefined) {
    return explicitFirstLogin;
  }

  const passwordChangeRequired =
    parseBoolean(user?.password_change_required) ??
    parseBoolean(user?.passwordChangeRequired) ??
    parseBoolean(user?.must_change_password) ??
    parseBoolean(user?.mustChangePassword) ??
    parseBoolean(data.data?.password_change_required) ??
    parseBoolean(data.data?.passwordChangeRequired) ??
    parseBoolean(data.data?.must_change_password) ??
    parseBoolean(data.data?.mustChangePassword) ??
    parseBoolean(data.password_change_required) ??
    parseBoolean(data.passwordChangeRequired) ??
    parseBoolean(data.must_change_password) ??
    parseBoolean(data.mustChangePassword);

  if (passwordChangeRequired !== undefined) {
    return passwordChangeRequired;
  }

  const passwordChanged =
    parseBoolean(user?.password_changed) ??
    parseBoolean(user?.passwordChanged) ??
    parseBoolean(data.data?.password_changed) ??
    parseBoolean(data.data?.passwordChanged) ??
    parseBoolean(data.password_changed) ??
    parseBoolean(data.passwordChanged);

  if (passwordChanged !== undefined) {
    return !passwordChanged;
  }

  return false;
}

function parseBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (["true", "1", "y", "yes"].includes(normalizedValue)) {
    return true;
  }

  if (["false", "0", "n", "no"].includes(normalizedValue)) {
    return false;
  }

  return undefined;
}

export async function changeFirstPassword(params: {
  accessToken: string;
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
  session: AuthSession;
}) {
  try {
    const { data } = await apiClient.put<PasswordChangeResponse>(
      "/doctor/auth/password/change",
      {
        current_password: params.currentPassword,
        new_password: params.newPassword,
        new_password_confirm: params.newPasswordConfirm,
      },
      {
        headers: {
          Authorization: `Bearer ${params.accessToken}`,
        },
      }
    );

    if (data.code !== 200) {
      throw new Error(data.message);
    }

    const session: AuthSession = {
      ...params.session,
      accessToken: params.accessToken,
      user: {
        ...params.session.user,
        isFirstLogin: false,
      },
    };

    markPasswordChanged(params.session.user.id);
    saveSession(session);

    return session;
  } catch (err) {
    throw new Error(
      getApiErrorMessage(err, "비밀번호 변경 중 오류가 발생했습니다.")
    );
  }
}

function hasChangedPassword(userId: string) {
  return getChangedPasswordUserIds().includes(userId);
}

function markPasswordChanged(userId: string) {
  const changedUserIds = getChangedPasswordUserIds();

  if (changedUserIds.includes(userId)) {
    return;
  }

  localStorage.setItem(
    PASSWORD_CHANGED_USERS_STORAGE_KEY,
    JSON.stringify([...changedUserIds, userId])
  );
}

function getChangedPasswordUserIds() {
  const savedUserIds = localStorage.getItem(PASSWORD_CHANGED_USERS_STORAGE_KEY);

  if (!savedUserIds) {
    return [];
  }

  try {
    const parsedUserIds = JSON.parse(savedUserIds);
    return Array.isArray(parsedUserIds)
      ? parsedUserIds.filter((userId): userId is string => typeof userId === "string")
      : [];
  } catch {
    localStorage.removeItem(PASSWORD_CHANGED_USERS_STORAGE_KEY);
    return [];
  }
}

export function isPasswordPolicyValid(password: string, userId: string) {
  const hasValidLength = password.length >= 8 && password.length <= 20;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isDifferentFromId = password !== userId;
  const hasNoRepeatedChars = !/(.)\1\1/.test(password);
  const hasNoSequentialChars = !hasSequentialChars(password);

  return (
    hasValidLength &&
    hasLetter &&
    hasNumber &&
    hasSpecial &&
    isDifferentFromId &&
    hasNoRepeatedChars &&
    hasNoSequentialChars
  );
}

export function getPasswordPolicyStatus(password: string, userId: string) {
  return [
    {
      label: "8자 이상 20자 이하",
      isValid: password.length >= 8 && password.length <= 20,
    },
    {
      label: "영문, 숫자, 특수문자 포함",
      isValid:
        /[A-Za-z]/.test(password) &&
        /\d/.test(password) &&
        /[^A-Za-z0-9]/.test(password),
    },
    {
      label: "기존 비밀번호 및 최근 사용 비밀번호 재사용 불가",
      isValid: password.length > 0,
    },
    {
      label: "동일 문자 3회 이상 및 연속 문자 사용 불가",
      isValid:
        password.length > 0 &&
        !/(.)\1\1/.test(password) &&
        !hasSequentialChars(password),
    },
    {
      label: "아이디와 동일한 비밀번호 사용 불가",
      isValid: password.length > 0 && password !== userId,
    },
  ];
}

function getApiErrorMessage(err: unknown, fallbackMessage: string) {
  if (!axios.isAxiosError(err)) {
    return err instanceof Error ? err.message : fallbackMessage;
  }

  const axiosError = err as AxiosError<{
    message?: string;
    detail?: string;
    error?: string;
  }>;

  if (axiosError.code === "ECONNABORTED") {
    return `요청 시간이 초과되었습니다. ${API_BASE_URL} 연결 상태를 확인해주세요.`;
  }

  if (!axiosError.response) {
    return `백엔드 서버에 연결할 수 없습니다. ${API_BASE_URL} 서버가 실행 중인지 확인해주세요.`;
  }

  return (
    axiosError.response?.data?.message ??
    axiosError.response?.data?.detail ??
    axiosError.response?.data?.error ??
    fallbackMessage
  );
}

function hasSequentialChars(password: string) {
  const normalized = password.toLowerCase();

  for (let index = 0; index < normalized.length - 2; index += 1) {
    const first = normalized.charCodeAt(index);
    const second = normalized.charCodeAt(index + 1);
    const third = normalized.charCodeAt(index + 2);

    if (second === first + 1 && third === second + 1) {
      return true;
    }

    if (second === first - 1 && third === second - 1) {
      return true;
    }
  }

  return false;
}
