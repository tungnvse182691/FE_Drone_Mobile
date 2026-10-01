import axios, {
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from 'axios';
import { uuidv4 } from '../utils/uuid';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  mustChangePassword: boolean;
  user?: unknown;
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
  onTokenPair: (pair: TokenPair) => void;
  onSessionEnded: () => void;
}

const AUTH_PATHS_WITHOUT_REFRESH = ['/auth/refresh', '/auth/login', '/auth/logout'];

const MAX_TRANSPORT_RETRIES = 2;
const MAX_RETRY_AFTER_MS = 30000;

const bridge: AuthBridge = {
  getAccessToken: () => null,
  getRefreshToken: () => null,
  onTokenPair: () => undefined,
  onSessionEnded: () => undefined,
};

export function configureAuthBridge(next: Partial<AuthBridge>): void {
  Object.assign(bridge, next);
}

const apiClient = axios.create({
  baseURL: 'https://api.roadguard.placeholder.dev/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

const bareClient = axios.create({
  baseURL: 'https://api.roadguard.placeholder.dev/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let refreshInFlight: Promise<string | null> | null = null;

function readErrorCode(error: unknown): string | null {
  if (!(error instanceof AxiosError)) {
    return null;
  }
  const data = error.response?.data as ApiErrorEnvelope | undefined;
  return typeof data?.code === 'string' ? data.code : null;
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
  return !AUTH_PATHS_WITHOUT_REFRESH.some((path) => url.includes(path));
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
    try {
      const response = await bareClient.post<TokenPair>('/auth/refresh', { refreshToken });
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
  // Ghi nhớ token đã dùng để phát hiện "token vừa được đổi" ở response interceptor.
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

    if (status === 401) {
      if (code === 'SESSION_REVOKED' || code === 'TOKEN_INVALID' || code === 'TOKEN_MISSING') {
        bridge.onSessionEnded();
        throw error;
      }
      // Chỉ TOKEN_EXPIRED mới được auto-refresh. AUTH_REQUIRED / 401 lạ không lặp refresh vô hạn.
      if (code === 'TOKEN_EXPIRED' && !config.__authRetried && isRefreshEligible(config.url)) {
        const current = bridge.getAccessToken();
        // Token đã được đổi (refresh ở request khác vừa xong) thì chỉ thử lại, không refresh thêm.
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

export { apiClient };