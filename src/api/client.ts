import axios, {
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from 'axios';
import { Platform } from 'react-native';
import { parseProblemDetails } from './problemDetails';

export interface AuthActorWire {
  id: string;
  displayName: string;
  role: string;
  version: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  mustChangePassword: boolean;
  user?: AuthActorWire;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForcedPasswordChangeRequest {
  username: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  operationId: string;
}

export interface PasswordRecoveryRequest {
  email: string;
}

export type ReporterTypeWire = 'CITIZEN' | 'INVESTOR_REPRESENTATIVE';

export interface RegisterReporterRequest {
  email: string;
  password: string;
  displayName: string;
  reporterType: ReporterTypeWire;
}

export interface RegistrationIntentResponse {
  intentId: string;
  status: string;
  resendAfterSeconds: number;
}

export interface VerifyReporterOtpRequest {
  intentId: string;
  otp: string;
}

export interface ResendReporterOtpRequest {
  intentId: string;
}

export interface ApiErrorEnvelope {
  code: string;
  message: string;
  details?: Array<{ field?: string; code?: string; message?: string }>;
  correlationId?: string;
  errors?: Record<string, string[]>;
  retryable?: boolean;
}

export interface AuthBridge {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  onRefreshStart: () => void;
  onTokenPair: (pair: TokenPair) => void;
  onSessionEnded: () => void;
  onPasswordChangeRequired: () => void;
}

/**
 * Cổng Backend RoadGuard (Candidate3 local, Docker roadguard-fe-starter01).
 * Thay đổi số cổng tại đây nếu docker-compose ánh xạ sang cổng khác.
 */
const LOCAL_BACKEND_PORT = 18081;

/**
 * Tự chọn base URL theo môi trường chạy:
 *
 *   1. web (Expo web / browser):
 *        http://localhost:<port>/api/v1
 *
 *   2. android emulator (AVD):
 *        http://10.0.2.2:<port>/api/v1
 *        (10.0.2.2 là alias của host machine từ bên trong Android emulator)
 *
 *   3. Máy thật (Android / iOS vật lý):
 *        Đặt biến môi trường EXPO_PUBLIC_API_HOST = <IP LAN của máy tính>,
 *        ví dụ: EXPO_PUBLIC_API_HOST=192.168.1.100 trong file .env.local
 *        → URL: http://192.168.1.100:<port>/api/v1
 *        Nếu không set → fallback về localhost (chỉ chạy đúng trên simulator/web).
 *
 * Hướng dẫn cài đặt cho máy thật:
 *   1. Tạo file .env.local tại gốc project (đã có trong .gitignore).
 *   2. Thêm dòng: EXPO_PUBLIC_API_HOST=<IP LAN thật của máy>
 *      (tìm IP LAN: ipconfig | findstr IPv4 trên Windows)
 *   3. Restart `expo start`.
 */
function resolveApiBaseUrl(): string {
  // Ưu tiên 1: biến môi trường (dành cho máy thật / CI)
  const envHost = process.env.EXPO_PUBLIC_API_HOST?.trim();
  if (envHost) {
    return `http://${envHost}:${LOCAL_BACKEND_PORT}/api/v1`;
  }

  // Ưu tiên 2: tự chọn theo Platform
  const base = Platform.select({
    web:     `http://localhost:${LOCAL_BACKEND_PORT}/api/v1`,
    android: `http://10.0.2.2:${LOCAL_BACKEND_PORT}/api/v1`,
    // ios simulator: localhost trỏ thẳng vào máy host. Máy thật dùng EXPO_PUBLIC_API_HOST.
    default: `http://localhost:${LOCAL_BACKEND_PORT}/api/v1`,
  });
  return base ?? `http://localhost:${LOCAL_BACKEND_PORT}/api/v1`;
}

export const API_BASE_URL = resolveApiBaseUrl();

const AUTH_BOOTSTRAP_PATHS = [
  '/auth/android/login',
  '/auth/android/refresh',
  '/auth/refresh',
  '/auth/login',
  '/auth/logout',
];

const SESSION_ENDED_CODES = new Set([
  'auth_session_revoked',
  'refresh_token_invalid',
  'refresh_token_expired',
]);

const REFRESHABLE_CODES = new Set(['auth_unauthorized', 'token_expired']);

const PASSWORD_CHANGE_REQUIRED_CODE = 'auth_password_change_required';

const ANDROID_REFRESH_PATH = '/auth/android/refresh';

const MAX_TRANSPORT_RETRIES = 2;
const MAX_RETRY_AFTER_MS = 30000;

const bridge: AuthBridge = {
  getAccessToken: () => null,
  getRefreshToken: () => null,
  onRefreshStart: () => undefined,
  onTokenPair: () => undefined,
  onSessionEnded: () => undefined,
  onPasswordChangeRequired: () => undefined,
};

export function configureAuthBridge(next: Partial<AuthBridge>): void {
  Object.assign(bridge, next);
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

const bareClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

interface SessionIdentity { subject: string; sessionId: string }
let refreshInFlight: { identity: SessionIdentity; promise: Promise<string | null> } | null = null;

/** Untrusted claims are ONLY a continuity guard. The server still authenticates every JWT.
 * Candidate3 AccessTokenFactory emits real sub/sid; never synthesize a session version.
 * Decode locally without depending on browser atob/Node Buffer in Hermes.
 */
function tokenIdentity(token: string | null): SessionIdentity | null {
  try {
    const parts = token?.split('.');
    if (parts?.length !== 3) return null;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
    if (!encoded || /[^A-Za-z0-9+/]/.test(encoded) || encoded.length % 4 === 1) return null;
    let bits = 0, value = 0, json = '';
    for (const character of encoded) {
      value = (value << 6) | alphabet.indexOf(character); bits += 6;
      if (bits >= 8) { bits -= 8; json += String.fromCharCode((value >>> bits) & 255); }
    }
    const claims = JSON.parse(json) as { sub?: unknown; sid?: unknown };
    return typeof claims.sub === 'string' && claims.sub && typeof claims.sid === 'string' && claims.sid
      ? { subject: claims.sub, sessionId: claims.sid } : null;
  } catch { return null; }
}

function sameSession(a: SessionIdentity | null, b: SessionIdentity | null): boolean {
  return Boolean(a && b && a.subject === b.subject && a.sessionId === b.sessionId);
}

type RetriableConfig = InternalAxiosRequestConfig & {
  __transportRetries?: number;
  __authRetried?: boolean;
  __tokenAtSend?: string | null;
  __sessionBound?: boolean;
  __sessionIdentity?: SessionIdentity | null;
  __detachedLogout?: boolean;
};

function sessionChanged(config: RetriableConfig): AxiosError {
  // No response body from a previous actor is exposed to the new session.
  return new AxiosError('Phiên đăng nhập đã thay đổi. Giữ nháp để kiểm tra kết quả.', 'auth_session_changed', config);
}

function isCurrentSession(config: RetriableConfig): boolean {
  const liveToken = bridge.getAccessToken();
  return config.__sessionIdentity
    ? sameSession(config.__sessionIdentity, tokenIdentity(liveToken))
    : !liveToken;
}

function mayReplay(config: RetriableConfig): boolean {
  if (config.__detachedLogout) return false;
  const method = config.method?.toUpperCase() ?? 'GET';
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true;
  if (method !== 'POST' || !String(AxiosHeaders.from(config.headers).get('Idempotency-Key') ?? '').trim()) return false;
  // Only writes whose idempotency contract was verified in T01. Other commands still
  // send once; ambiguous outcomes stay with their caller for reconciliation.
  const path = config.url?.split('?')[0] ?? '';
  return /^\/reports(?:\/[^/]+\/supplements)?$/.test(path) ||
    /^\/reporter-evidence\/uploads(?:\/[^/]+\/(?:part-urls|complete))?$/.test(path);
}

function readErrorCode(error: unknown): string | null {
  if (!(error instanceof AxiosError)) {
    return null;
  }
  return parseProblemDetails(error.response?.data).code;
}

function readRetryAfter(error: AxiosError): number | null {
  const headers = error.response?.headers as unknown;
  if (!headers || typeof headers !== 'object') {
    return null;
  }
  const bag = headers as { get?: unknown; [key: string]: unknown };
  let raw: unknown = null;
  if (typeof bag.get === 'function') {
    raw = (bag.get as (name: string) => unknown)('retry-after');
  }
  if (raw === null || raw === undefined) {
    raw = bag['retry-after'] ?? bag['Retry-After'] ?? null;
  }
  if (typeof raw !== 'string' || raw.trim() === '') {
    return null;
  }
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) {
    return seconds >= 0 ? Math.min(seconds * 1000, MAX_RETRY_AFTER_MS) : null;
  }
  const date = Date.parse(raw);
  if (Number.isNaN(date)) {
    return null;
  }
  return Math.min(Math.max(0, date - Date.now()), MAX_RETRY_AFTER_MS);
}

function shouldRetryTransport(error: unknown): boolean {
  if (!(error instanceof AxiosError)) {
    return false;
  }
  if (error.code === 'ERR_CANCELED' || error.code === 'auth_session_changed') return false;
  const status = error.response?.status;
  if (status === undefined) {
    return true;
  }
  const data = error.response?.data as ApiErrorEnvelope | undefined;
  if (data?.retryable === false) {
    return false;
  }
  return status === 429 || status === 503 || status >= 500;
}

function computeRetryDelay(error: AxiosError, attempt: number): number {
  const fromHeader = readRetryAfter(error);
  if (fromHeader !== null) {
    return fromHeader;
  }
  const backoff = Math.min(1000 * 2 ** attempt, 8000);
  return backoff + Math.floor(Math.random() * 250);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRefreshEligible(url: string | undefined): boolean {
  if (!url) {
    return true;
  }
  return !AUTH_BOOTSTRAP_PATHS.some((path) => url.includes(path));
}

async function refreshAccessToken(expected?: SessionIdentity): Promise<string | null> {
  const accessToken = bridge.getAccessToken();
  const identity = tokenIdentity(accessToken);
  const refreshToken = bridge.getRefreshToken();
  if (!identity || !refreshToken || (expected && !sameSession(identity, expected))) return null;
  if (refreshInFlight && sameSession(refreshInFlight.identity, identity)) return refreshInFlight.promise;
  const stillOwnsCredentials = () => bridge.getAccessToken() === accessToken && bridge.getRefreshToken() === refreshToken;
  const flight = { identity, promise: Promise.resolve<string | null>(null) };
  refreshInFlight = flight;
  flight.promise = (async () => {
    try {
      bridge.onRefreshStart();
      const response = await bareClient.post<TokenPair>(ANDROID_REFRESH_PATH, { refreshToken });
      const pair = response.data;
      if (!stillOwnsCredentials() || !sameSession(identity, tokenIdentity(pair.accessToken)) ||
          !pair.refreshToken || (pair.user && pair.user.id !== identity.subject)) return null;
      bridge.onTokenPair(pair);
      return bridge.getAccessToken() === pair.accessToken ? pair.accessToken : null;
    } catch {
      return null;
    } finally {
      if (refreshInFlight === flight) refreshInFlight = null;
    }
  })();

  return flight.promise;
}

apiClient.interceptors.request.use((config) => {
  const retriable = config as RetriableConfig;
  const headers = AxiosHeaders.from(config.headers);
  const token = bridge.getAccessToken();
  if (!retriable.__sessionBound) {
    retriable.__sessionBound = true;
    // logoutReal captures A's bearer before clearing the store. Never replace it
    // with B's token or let an old logout response change B's auth state.
    retriable.__detachedLogout = config.url === '/auth/logout';
    retriable.__sessionIdentity = tokenIdentity(token);
    if (retriable.__detachedLogout) return config;
    const explicit = headers.get('Authorization');
    if ((token && !retriable.__sessionIdentity) || (explicit && explicit !== `Bearer ${token}`)) throw sessionChanged(retriable);
  }
  if (retriable.__detachedLogout) return config;
  if (!isCurrentSession(retriable)) throw sessionChanged(retriable);
  retriable.__tokenAtSend = token;
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  config.headers = headers;
  return config;
}, (error: unknown) => { throw error; }, { synchronous: true });

apiClient.interceptors.response.use(
  (response) => {
    const config = response.config as RetriableConfig;
    if (!config.__detachedLogout && !isCurrentSession(config)) throw sessionChanged(config);
    return response;
  },
  async (error: unknown) => {
    const config = error instanceof AxiosError ? (error.config as RetriableConfig | undefined) : undefined;
    if (!config) {
      throw error;
    }
    if (config.__detachedLogout) throw error;
    if (!isCurrentSession(config)) throw sessionChanged(config);

    config.__transportRetries = config.__transportRetries ?? 0;
    config.__authRetried = config.__authRetried ?? false;

    const code = readErrorCode(error);
    const status = error instanceof AxiosError ? error.response?.status : undefined;

    if (status === 403 && code === PASSWORD_CHANGE_REQUIRED_CODE && config.__sessionIdentity && config.__tokenAtSend === bridge.getAccessToken()) {
      bridge.onPasswordChangeRequired();
      throw error;
    }

    if (status === 401) {
      if (code && SESSION_ENDED_CODES.has(code)) {
        if (config.__sessionIdentity && config.__tokenAtSend === bridge.getAccessToken()) bridge.onSessionEnded();
        throw error;
      }

      const refreshable = code === null || REFRESHABLE_CODES.has(code);
      if (refreshable && config.__sessionIdentity && !config.__authRetried && isRefreshEligible(config.url)) {
        const current = bridge.getAccessToken();
        if (config.__tokenAtSend && current && current !== config.__tokenAtSend) {
          if (!mayReplay(config)) throw error;
          config.__authRetried = true;
          const headers = AxiosHeaders.from(config.headers);
          headers.set('Authorization', `Bearer ${current}`);
          config.headers = headers;
          return apiClient.request(config);
        }

        config.__authRetried = true;
        const token = await refreshAccessToken(config.__sessionIdentity);
        if (!isCurrentSession(config)) throw sessionChanged(config);
        if (token) {
          if (!mayReplay(config)) throw error;
          const headers = AxiosHeaders.from(config.headers);
          headers.set('Authorization', `Bearer ${token}`);
          config.headers = headers;
          return apiClient.request(config);
        }
        if (config.__tokenAtSend === bridge.getAccessToken()) bridge.onSessionEnded();
      }
      throw error;
    }

    if (mayReplay(config) && shouldRetryTransport(error) && config.__transportRetries < MAX_TRANSPORT_RETRIES) {
      await sleep(computeRetryDelay(error as AxiosError, config.__transportRetries));
      if (!isCurrentSession(config)) throw sessionChanged(config);
      config.__transportRetries += 1;
      return apiClient.request(config);
    }

    throw error;
  }
);

export { apiClient, bareClient, refreshAccessToken };

/** Path refresh token Android — export để `authApi.ts` tham chiếu tập trung. */
export const ANDROID_REFRESH_PATH_EXPORT = '/auth/android/refresh';
