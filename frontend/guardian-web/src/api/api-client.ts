import axios, {
  AxiosHeaders,
  isAxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

import { useAuthStore } from "../stores/auth-store";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

interface RefreshTokenResponse {
  code: number;
  message: string;
  result?: {
    access_token: string;
  };
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const authSkipUrls = ["/auth/login", "/auth/signup", "/auth/refresh"];
let refreshPromise: Promise<string> | null = null;

const isAuthSkipUrl = (url?: string) =>
  authSkipUrls.some((skipUrl) => url?.includes(skipUrl));

const setAuthorizationHeader = (
  config: InternalAxiosRequestConfig,
  token: string,
) => {
  if (config.headers instanceof AxiosHeaders) {
    config.headers.set("Authorization", `Bearer ${token}`);
    return;
  }

  config.headers = new AxiosHeaders(config.headers);
  config.headers.set("Authorization", `Bearer ${token}`);
};

const requestNewAccessToken = async (refreshToken: string) => {
  const response = await axios.post<RefreshTokenResponse>(
    `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
    undefined,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshToken}`,
      },
    },
  );

  if (response.data.code !== 200 || !response.data.result?.access_token) {
    throw new Error(response.data.message || "세션이 만료되었습니다.");
  }

  return response.data.result.access_token;
};

const refreshAndRetryRequest = async (originalRequest: RetryableRequestConfig) => {
  if (originalRequest._retry || isAuthSkipUrl(originalRequest.url)) {
    return Promise.reject(new Error("Token refresh skipped."));
  }

  const { guardian, updateAccessToken, clearAuth } = useAuthStore.getState();

  if (!guardian?.refreshToken) {
    clearAuth();
    return Promise.reject(new Error("Refresh token is missing."));
  }

  try {
    originalRequest._retry = true;
    refreshPromise =
      refreshPromise ?? requestNewAccessToken(guardian.refreshToken);

    const accessToken = await refreshPromise;
    refreshPromise = null;
    updateAccessToken(accessToken);
    setAuthorizationHeader(originalRequest, accessToken);

    return apiClient(originalRequest);
  } catch (refreshError) {
    refreshPromise = null;
    clearAuth();
    return Promise.reject(refreshError);
  }
};

apiClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().guardian?.accessToken;

  if (accessToken && !isAuthSkipUrl(config.url)) {
    setAuthorizationHeader(config, accessToken);
  }

  return config;
});

apiClient.interceptors.response.use(
  async (response) => {
    const responseCode = (response.data as { code?: number } | undefined)?.code;

    if (responseCode === 401 && !isAuthSkipUrl(response.config.url)) {
      return refreshAndRetryRequest(response.config as RetryableRequestConfig);
    }

    return response;
  },
  async (error) => {
    if (!isAxiosError(error)) {
      return Promise.reject(error);
    }

    const responseCode = (error.response?.data as { code?: number } | undefined)
      ?.code;

    if (error.response?.status !== 401 && responseCode !== 401) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as RetryableRequestConfig | undefined;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (originalRequest._retry || isAuthSkipUrl(originalRequest.url)) {
      return Promise.reject(error);
    }

    return refreshAndRetryRequest(originalRequest);
  },
);
