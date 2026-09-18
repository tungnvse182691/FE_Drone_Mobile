import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types/domain';
import { RoleCode } from '../types/enums';

interface AuthState {
  user: User | null;
  role: RoleCode | null;
  token: string | null;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      token: null,
      login: (user) => set({ user, role: user.role_code, token: user.token }),
      logout: () => set({ user: null, role: null, token: null }),
    }),
    { name: 'auth-storage' },
  ),
);