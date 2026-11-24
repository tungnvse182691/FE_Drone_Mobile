import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types/domain';
import { RoleCode } from '../types/enums';
import { appStorage } from './storage';
import {
  configureAuthBridge,
  API_BASE_URL,
  bareClient,
  type AuthActorWire,
  type TokenPair,
} from '../api/client';
import { mapProfileRole } from '../types/roleAdapter';
import { logoutReal, passwordSessionIdentity } from '../api/authApi';
import { uuidv4 } from '../utils/uuid';
import { createSecureSession } from './secureSession';
import type { LocalDraftReadIdentity } from '../offline/localDraftRead';

export type AuthStatus =
  | 'SIGNED_OUT'
  | 'OTP_PENDING'
  | 'VERIFIED_NEEDS_LOGIN'
  | 'AUTHENTICATED'
  | 'REFRESHING';

const REFRESH_SECRET_KEY = 'roadguard.refresh_token';

type PersistedUser = Omit<User, 'token' | 'refresh_token'>;

type PersistedAuth = {
  user: PersistedUser | null;
  role: RoleCode | null;
};

interface AuthState {
  authReady: boolean;
  authRestoreError: boolean;
  dismissAuthRestore: () => void;
  forcedChangeUsername: string | null;
  beginForcedPasswordChange: (username: string) => void;
  status: AuthStatus;
  user: User | null;
  role: RoleCode | null;
  token: string | null;
  refreshToken: string | null;
  login: (user: User, pair?: TokenPair) => void;
  logout: () => void;
  setToken: (token: string | null) => void;
  applyTokenPair: (pair: TokenPair) => void;
  beginOtp: () => void;
  markOtpVerified: () => void;
  beginRefresh: () => void;
  requirePasswordChange: () => void;
  restoreRefreshToken: () => Promise<void>;
  operatorLocalReadScope: () => Promise<string | null>;
  localDraftReadIdentity: (role: LocalDraftReadIdentity['role']) => Promise<LocalDraftReadIdentity | null>;
}

function stripCredentials(user: User | null): PersistedUser | null {
  if (!user) {
    return null;
  }
  const { token: _token, refresh_token: _refreshToken, ...safe } = user;
  return safe;
}

const secureSession = createSecureSession({
  read: async () => await SecureStore.isAvailableAsync() ? SecureStore.getItemAsync(REFRESH_SECRET_KEY) : null,
  write: async (value) => {
    if (!await SecureStore.isAvailableAsync()) throw new Error('auth_secure_store_unavailable');
    if (value) await SecureStore.setItemAsync(REFRESH_SECRET_KEY, value);
    else await SecureStore.deleteItemAsync(REFRESH_SECRET_KEY);
  },
  identity: passwordSessionIdentity,
  key: uuidv4,
  refresh: async (refreshToken, key) => (await bareClient.post<TokenPair>(
    '/auth/android/refresh', { refreshToken }, { headers: { 'Idempotency-Key': key } },
  )).data,
});

export function buildUserFromActor(
  actor: AuthActorWire,
  fallbackEmail: string,
  mustChangePassword: boolean,
): User | null {
  const role_code = mapProfileRole(actor.role);
  if (!role_code) {
    return null;
  }
  return {
    id: actor.id,
    role_code,
    full_name: actor.displayName,
    phone_or_email: fallbackEmail,
    is_reporter: role_code === RoleCode.REPORTER ? true : undefined,
    employee_code: '',
    must_change_password: mustChangePassword,
    token: '',
    refresh_token: '',
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      authReady: false,
      authRestoreError: false,
      dismissAuthRestore: () => set({ authReady: true, authRestoreError: false }),
      forcedChangeUsername: null,
      // Ephemeral routing context only; never contains a password or grants a session.
      beginForcedPasswordChange: (username) => set({ forcedChangeUsername: username.trim() }),
      status: 'SIGNED_OUT',
      user: null,
      role: null,
      token: null,
      refreshToken: null,

      login: (user, pair) => {
        const accessToken = pair?.accessToken ?? user.token ?? null;
        const refreshToken = pair?.refreshToken ?? user.refresh_token ?? null;
        const roleCode =
          (pair?.user ? mapProfileRole(pair.user.role) : null) ?? user.role_code;
        const mustChangePassword = pair?.mustChangePassword ?? user.must_change_password;
        const nextUser: User = {
          ...user,
          role_code: roleCode,
          must_change_password: mustChangePassword,
        };
        set({
          authReady: true,
          authRestoreError: false,
          forcedChangeUsername: null,
          status: 'AUTHENTICATED',
          user: nextUser,
          role: nextUser.role_code,
          token: accessToken,
          refreshToken,
        });
        if (pair) void secureSession.save(pair, API_BASE_URL).catch(() => undefined);
        else void secureSession.clear().catch(() => undefined);
      },

      logout: () => {
        const accessToken = get().token;
        set({
          authReady: true,
          authRestoreError: false,
          forcedChangeUsername: null,
          status: 'SIGNED_OUT',
          user: null,
          role: null,
          token: null,
          refreshToken: null,
        });
        void secureSession.clear().catch(() => undefined);
        if (accessToken) {
          // API-007: báo server thu hồi phiên (best-effort — phiên local luôn kết thúc ngay,
          // lỗi mạng không được chặn người dùng đăng xuất).
          void logoutReal(accessToken).catch(() => undefined);
        }
      },

      setToken: (token) => set({ token }),

      applyTokenPair: (pair) => {
        const wireRole = pair.user ? mapProfileRole(pair.user.role) : null;
        set((state) => {
          const nextRole = wireRole ?? state.role;
          // BE rotate cả cặp (API-003): LUÔN lưu refresh token MỚI. Nếu một response
          // không mang refresh token thì giữ token hiện tại — tuyệt đối không ghi đè rỗng,
          // nếu không lần refresh sau sẽ dính refresh_token_invalid oan.
          const nextRefreshToken = pair.refreshToken ?? state.refreshToken;
          const nextUser = state.user
            ? {
                ...state.user,
                role_code: nextRole ?? state.user.role_code,
                full_name: pair.user?.displayName ?? state.user.full_name,
                must_change_password: pair.mustChangePassword,
                token: pair.accessToken,
                refresh_token: nextRefreshToken ?? '',
              }
            : state.user;
          return {
            status: 'AUTHENTICATED',
            token: pair.accessToken,
            refreshToken: nextRefreshToken,
            role: nextRole,
            user: nextUser,
          };
        });
      },

      beginOtp: () => set({ status: 'OTP_PENDING' }),

      markOtpVerified: () =>
        set((state) =>
          state.status === 'OTP_PENDING' ? { status: 'VERIFIED_NEEDS_LOGIN' } : {},
        ),

      beginRefresh: () =>
        set((state) => (state.status === 'AUTHENTICATED' ? { status: 'REFRESHING' } : {})),

      requirePasswordChange: () =>
        set((state) =>
          state.user
            ? { user: { ...state.user, must_change_password: true } }
            : {},
        ),

      operatorLocalReadScope: async () => {
        const owner = get().user;
        if (!get().authRestoreError || get().authReady || get().token ||
            owner?.role_code !== RoleCode.DRONE_OPERATOR || owner.must_change_password) return null;
        const identity = await secureSession.localIdentity(API_BASE_URL, owner.id);
        if (!identity || get().user !== owner || !get().authRestoreError || get().authReady || get().token) return null;
        return JSON.stringify([API_BASE_URL, identity, '']);
      },

      localDraftReadIdentity: async (role) => {
        if (role !== RoleCode.REPAIR_CREW && role !== RoleCode.REPORTER) return null;
        const owner = get().user;
        const eligible = () => get().user === owner && get().role === role &&
          owner?.role_code === role && !owner.must_change_password &&
          get().authRestoreError && !get().authReady && !get().token;
        if (!eligible() || !owner) return null;
        const scope = await secureSession.localIdentity(API_BASE_URL, owner.id);
        if (!scope || !eligible()) return null;
        // Read-only provenance, never a restored Bearer session or dispatch authority.
        return { environment: API_BASE_URL, actor: owner.id, scope, role };
      },

      restoreRefreshToken: async () => {
        const owner = get().user;
        if (get().token) { set({ authReady: true }); return; }
        set({ authReady: false, authRestoreError: false });
        try {
          const pair = owner ? await secureSession.restore(API_BASE_URL, owner.id) : null;
          if (get().user !== owner || get().token) return;
          if (pair) get().applyTokenPair(pair);
          set({ authReady: true });
        } catch (error) {
          if (get().user !== owner || get().token) return;
          const status = (error as { response?: { status?: number } })?.response?.status;
          if (status === 401 || status === 403) {
            get().logout();
          } else {
            // Keep the exact pending rotation for retry after timeout/restart.
            set({ authRestoreError: true });
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: appStorage,
      partialize: (state) => ({
        user: stripCredentials(state.user),
        role: state.role,
      }),
      merge: (persisted, current) => {
        const restored = (persisted ?? {}) as Partial<PersistedAuth>;
        const user = (restored.user ?? null) as User | null;
        return {
          ...current,
          user,
          role: (restored.role ?? null) as RoleCode | null,
          status: user ? 'VERIFIED_NEEDS_LOGIN' : current.status,
        };
      },
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
    onRefreshStart: () => useAuthStore.getState().beginRefresh(),
    onTokenPair: (pair) => useAuthStore.getState().applyTokenPair(pair),
    onSessionEnded: () => useAuthStore.getState().logout(),
    onPasswordChangeRequired: () => useAuthStore.getState().requirePasswordChange(),
    rotateCredentials: async () => {
      const owner = useAuthStore.getState().user;
      return owner ? secureSession.restore(API_BASE_URL, owner.id) : null;
    },
  });
}

initAuthBridge();
