import { create } from "zustand";
import {
  AuthSession,
  clearSession,
  getSavedSession,
  saveSession,
} from "../api/authApi";

interface SetSessionOptions {
  persist?: boolean;
}

export interface AuthState {
  session: AuthSession | null;
  isAuthenticated: boolean;
  setSession: (session: AuthSession, options?: SetSessionOptions) => void;
  clearAuth: () => void;
}

const savedSession = getSavedSession();

export const useAuthStore = create<AuthState>((set) => ({
  session: savedSession,
  isAuthenticated: Boolean(savedSession),
  setSession: (session, options) => {
    if (options?.persist !== false) {
      saveSession(session);
    }

    set({
      session,
      isAuthenticated: true,
    });
  },
  clearAuth: () => {
    clearSession();
    set({
      session: null,
      isAuthenticated: false,
    });
  },
}));
