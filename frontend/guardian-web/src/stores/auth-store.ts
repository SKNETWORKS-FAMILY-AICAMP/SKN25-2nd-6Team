import { create } from "zustand";

interface GuardianAuth {
  loginid: string;
  name?: string;
  phone?: string;
  accessToken?: string;
  refreshToken?: string;
}

interface SetAuthPayload extends GuardianAuth {
  remember: boolean;
}

interface AuthState {
  guardian: GuardianAuth | null;
  isAuthenticated: boolean;
  setAuth: (payload: SetAuthPayload) => void;
  updateAccessToken: (accessToken: string) => void;
  updateGuardianProfile: (profile: Pick<GuardianAuth, "name" | "phone">) => void;
  clearAuth: () => void;
}

const storageKey = "medipaw-guardian-auth";

const readStoredAuth = (): GuardianAuth | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const stored =
    window.localStorage.getItem(storageKey) ||
    window.sessionStorage.getItem(storageKey);

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as GuardianAuth;
  } catch {
    window.localStorage.removeItem(storageKey);
    window.sessionStorage.removeItem(storageKey);
    return null;
  }
};

const getActiveStorage = (): Storage => {
  if (typeof window === "undefined") return window.sessionStorage;
  return window.localStorage.getItem(storageKey)
    ? window.localStorage
    : window.sessionStorage;
};

const storedAuth = readStoredAuth();

export const useAuthStore = create<AuthState>((set) => ({
  guardian: storedAuth,
  isAuthenticated: Boolean(storedAuth),
  setAuth: ({ remember, ...guardian }) => {
    if (remember) {
      window.localStorage.setItem(storageKey, JSON.stringify(guardian));
      window.sessionStorage.removeItem(storageKey);
    } else {
      window.sessionStorage.setItem(storageKey, JSON.stringify(guardian));
      window.localStorage.removeItem(storageKey);
    }

    set({
      guardian,
      isAuthenticated: true,
    });
  },
  updateAccessToken: (accessToken) => {
    set((current) => {
      if (!current.guardian) {
        return current;
      }

      const guardian = {
        ...current.guardian,
        accessToken,
      };

      getActiveStorage().setItem(storageKey, JSON.stringify(guardian));

      return {
        guardian,
        isAuthenticated: true,
      };
    });
  },
  updateGuardianProfile: (profile) => {
    set((current) => {
      if (!current.guardian) {
        return current;
      }

      const guardian = {
        ...current.guardian,
        ...profile,
      };

      getActiveStorage().setItem(storageKey, JSON.stringify(guardian));

      return {
        guardian,
        isAuthenticated: true,
      };
    });
  },
  clearAuth: () => {
    window.localStorage.removeItem(storageKey);
    window.sessionStorage.removeItem(storageKey);
    set({
      guardian: null,
      isAuthenticated: false,
    });
  },
}));
