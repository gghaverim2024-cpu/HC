import { create } from 'zustand';
import { authApi } from '../api';
import { getToken, setToken } from '../api/client';
import type { PublicUser } from '../types';

interface AuthState {
  user: PublicUser | null;
  token: string | null;
  loading: boolean;
  initialized: boolean;
  init: () => Promise<void>;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (username: string, email: string, phone: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  setUser: (user: PublicUser) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: getToken(),
  loading: false,
  initialized: false,

  init: async () => {
    const token = getToken();
    if (!token) {
      set({ initialized: true });
      return;
    }
    try {
      const { user } = await authApi.me();
      set({ user, token, initialized: true });
    } catch {
      setToken(null);
      set({ user: null, token: null, initialized: true });
    }
  },

  login: async (usernameOrEmail, password) => {
    set({ loading: true });
    try {
      const { token, user } = await authApi.login({ usernameOrEmail, password });
      setToken(token);
      set({ token, user, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  register: async (username, email, phone, password) => {
    set({ loading: true });
    try {
      const { token, user } = await authApi.register({ username, email, phone, password });
      setToken(token);
      set({ token, user, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  logout: () => {
    setToken(null);
    set({ user: null, token: null });
  },

  refreshMe: async () => {
    if (!get().token) return;
    const { user } = await authApi.me();
    set({ user });
  },

  setUser: (user) => set({ user }),
}));
