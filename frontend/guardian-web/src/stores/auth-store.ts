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

  const stored = window.localStorage.getItem(storageKey);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as GuardianAuth;
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
};

const storedAuth = readStoredAuth();

export const useAuthStore = create<AuthState>((set) => ({
  guardian: storedAuth,
  isAuthenticated: Boolean(storedAuth),
  setAuth: ({ remember, ...guardian }) => {
    if (remember) {
      window.localStorage.setItem(storageKey, JSON.stringify(guardian));
    } else {
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

      if (window.localStorage.getItem(storageKey)) {
        window.localStorage.setItem(storageKey, JSON.stringify(guardian));
      }

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

      if (window.localStorage.getItem(storageKey)) {
        window.localStorage.setItem(storageKey, JSON.stringify(guardian));
      }

      return {
        guardian,
        isAuthenticated: true,
      };
    });
  },
  clearAuth: () => {
    window.localStorage.removeItem(storageKey);
    set({
      guardian: null,
      isAuthenticated: false,
    });
  },
}));
