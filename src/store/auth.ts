import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types/domain';
import { RoleCode } from '../types/enums';
import { appStorage } from './storage';
import { configureAuthBridge, type TokenPair } from '../api/client';

type PersistedUser = Omit<User, 'token' | 'refresh_token'>;

interface AuthState {
  user: User | null;
  role: RoleCode | null;
  token: string | null;
  refreshToken: string | null;
  login: (user: User) => void;
  logout: () => void;
  setToken: (token: string | null) => void;
  applyTokenPair: (pair: TokenPair) => void;
}

function stripCredentials(user: User | null): PersistedUser | null {
  if (!user) {
    return null;
  }
  const { token: _token, refresh_token: _refreshToken, ...safe } = user;
  return safe;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      token: null,
      refreshToken: null,
      login: (user) =>
        set({
          user,
          role: user.role_code,
          token: user.token,
          refreshToken: user.refresh_token,
        }),
      logout: () => set({ user: null, role: null, token: null, refreshToken: null }),
      setToken: (token) => set({ token }),
      applyTokenPair: (pair) =>
        set((state) => ({
          token: pair.accessToken,
          refreshToken: pair.refreshToken,
          user: state.user
            ? { ...state.user, token: pair.accessToken, refresh_token: pair.refreshToken }
            : state.user,
        })),
    }),
    {
      name: 'auth-storage',
      storage: appStorage,
      partialize: (state) => ({
        user: stripCredentials(state.user),
        role: state.role,
      }),
    },
  ),
);

let bridgeConfigured = false;

export function initAuthBridge(): void {
  if (bridgeConfigured) {
    return;
  }
  bridgeConfigured = true;
  configureAuthBridge({
    getAccessToken: () => useAuthStore.getState().token,
    getRefreshToken: () => useAuthStore.getState().refreshToken,
    onTokenPair: (pair) => useAuthStore.getState().applyTokenPair(pair),
    onSessionEnded: () => useAuthStore.getState().logout(),
  });
}

initAuthBridge();