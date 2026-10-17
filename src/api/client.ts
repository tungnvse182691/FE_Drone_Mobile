import axios, {
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from 'axios';
import { uuidv4 } from '../utils/uuid';
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
  traceId?: string;
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

export const API_BASE_URL = 'https://api.roadguard.placeholder.dev/api/v1';

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

let refreshInFlight: Promise<string | null> | null = null;

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

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const refreshToken = bridge.getRefreshToken();
    if (!refreshToken) {
      return null;
    }
    bridge.onRefreshStart();
    try {
      const response = await bareClient.post<TokenPair>(ANDROID_REFRESH_PATH, { refreshToken });
      const pair = response.data;
      bridge.onTokenPair(pair);
      return pair.accessToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

type RetriableConfig = InternalAxiosRequestConfig & {
  __transportRetries?: number;
  __authRetried?: boolean;
  __tokenAtSend?: string | null;
};

apiClient.interceptors.request.use((config) => {
  const retriable = config as RetriableConfig;
  const headers = AxiosHeaders.from(config.headers);
  const token = bridge.getAccessToken();
  if (!retriable.__tokenAtSend) {
    retriable.__tokenAtSend = token;
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const method = (config.method ?? 'get').toLowerCase();
  if (method !== 'get' && !headers.has('Idempotency-Key')) {
    headers.set('Idempotency-Key', uuidv4());
  }
  config.headers = headers;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const config = error instanceof AxiosError ? (error.config as RetriableConfig | undefined) : undefined;
    if (!config) {
      throw error;
    }

    config.__transportRetries = config.__transportRetries ?? 0;
    config.__authRetried = config.__authRetried ?? false;

    const code = readErrorCode(error);
    const status = error instanceof AxiosError ? error.response?.status : undefined;

    if (status === 403 && code === PASSWORD_CHANGE_REQUIRED_CODE) {
      bridge.onPasswordChangeRequired();
      throw error;
    }

    if (status === 401) {
      if (code && SESSION_ENDED_CODES.has(code)) {
        bridge.onSessionEnded();
        throw error;
      }

      const refreshable = code === null || REFRESHABLE_CODES.has(code);
      if (refreshable && !config.__authRetried && isRefreshEligible(config.url)) {
        const current = bridge.getAccessToken();
        if (config.__tokenAtSend && current && current !== config.__tokenAtSend) {
          config.__authRetried = true;
          const headers = AxiosHeaders.from(config.headers);
          headers.set('Authorization', `Bearer ${current}`);
          config.headers = headers;
          return apiClient.request(config);
        }

        config.__authRetried = true;
        const token = await refreshAccessToken();
        if (token) {
          const headers = AxiosHeaders.from(config.headers);
          headers.set('Authorization', `Bearer ${token}`);
          config.headers = headers;
          return apiClient.request(config);
        }
        bridge.onSessionEnded();
      }
      throw error;
    }

    if (shouldRetryTransport(error) && config.__transportRetries < MAX_TRANSPORT_RETRIES) {
      await sleep(computeRetryDelay(error as AxiosError, config.__transportRetries));
      config.__transportRetries += 1;
      return apiClient.request(config);
    }

    throw error;
  }
);

export { apiClient, bareClient, refreshAccessToken };
