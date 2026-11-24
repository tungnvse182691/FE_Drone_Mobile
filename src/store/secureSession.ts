import type { TokenPair } from '../api/client';

/** No error body/message/config or credentials may cross this diagnostic boundary. */
export function sessionRestoreDiagnostic(error: unknown): string {
  const e = error as { response?: { status?: unknown }; code?: unknown; message?: unknown } | null;
  const status = e?.response?.status;
  if (typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599) return `http-${status}`;
  if (e?.code === 'ERR_NETWORK') return 'network';
  if (e?.code === 'ECONNABORTED' || e?.code === 'ETIMEDOUT') return 'timeout';
  if (e?.message === 'auth_credential_mismatch') return 'credential-continuity';
  if (e?.message === 'auth_secure_store_unavailable') return 'secure-store-unavailable';
  return 'local-or-response';
}

interface Credential {
  version: 1;
  environment: string;
  actor: string;
  identity: string;
  refreshToken: string;
  pendingKey: string | null;
}
interface Dependencies {
  read: () => Promise<string | null>;
  write: (value: string | null) => Promise<void>;
  identity: (token: string) => string | null;
  key: () => string;
  refresh: (token: string, key: string) => Promise<TokenPair>;
}

/** SecureStore only. No access token, password, or SQLite credential journal.
 * A pending rotation retains its exact body/key across process death.
 */
export function createSecureSession(deps: Dependencies) {
  let epoch = 0;
  let writes: Promise<void> = Promise.resolve();
  let flight: { epoch: number; promise: Promise<TokenPair | null> } | null = null;
  const write = (value: Credential | null) => {
    const job = writes.catch(() => undefined).then(() => deps.write(value ? JSON.stringify(value) : null));
    writes = job;
    return job;
  };
  const credential = (pair: TokenPair, environment: string): Credential => {
    const identity = deps.identity(pair.accessToken);
    if (!identity || !pair.refreshToken || !pair.user?.id || JSON.parse(identity)[0] !== pair.user.id) {
      throw new Error('auth_credential_mismatch');
    }
    return { version: 1, environment, actor: pair.user.id, identity, refreshToken: pair.refreshToken, pendingKey: null };
  };
  return {
    /** Local snapshot partition only; never an authenticated session or HTTP credential. */
    async localIdentity(environment: string, actor: string): Promise<string | null> {
      const generation = epoch;
      await writes;
      const raw = await deps.read();
      if (epoch !== generation || !raw) return null;
      try {
        const saved = JSON.parse(raw) as Credential;
        const identity = JSON.parse(saved.identity);
        return saved.version === 1 && saved.environment === environment && saved.actor === actor &&
          Array.isArray(identity) && identity[0] === actor && typeof identity[1] === 'string' && !!identity[1] &&
          typeof saved.refreshToken === 'string' && !!saved.refreshToken &&
          (saved.pendingKey === null || typeof saved.pendingKey === 'string' && !!saved.pendingKey)
          ? saved.identity : null;
      } catch { return null; }
    },
    save(pair: TokenPair, environment: string) {
      epoch += 1;
      return write(credential(pair, environment));
    },
    clear() {
      epoch += 1;
      return write(null);
    },
    restore(environment: string, actor: string): Promise<TokenPair | null> {
      if (flight?.epoch === epoch) return flight.promise;
      const generation = epoch;
      const current = () => epoch === generation;
      const active = { epoch: generation, promise: Promise.resolve<TokenPair | null>(null) };
      flight = active;
      active.promise = (async () => {
        await writes;
        const raw = await deps.read();
        if (!current() || !raw) return null;
        let saved: Credential;
        try { saved = JSON.parse(raw); } catch { return null; }
        if (saved.version !== 1 || saved.environment !== environment || saved.actor !== actor ||
            typeof saved.identity !== 'string' || !saved.identity ||
            typeof saved.refreshToken !== 'string' || !saved.refreshToken ||
            (saved.pendingKey !== null && (typeof saved.pendingKey !== 'string' || !saved.pendingKey))) return null;
        const pending = { ...saved, pendingKey: saved.pendingKey ?? deps.key() };
        if (!current()) return null;
        await write(pending);
        if (!current()) return null;
        const pair = await deps.refresh(pending.refreshToken, pending.pendingKey);
        if (!current()) return null;
        const next = credential(pair, environment);
        if (next.identity !== saved.identity || next.actor !== actor) throw new Error('auth_credential_mismatch');
        await write(next);
        return current() ? pair : null;
      })().finally(() => { if (flight === active) flight = null; });
      return active.promise;
    },
  };
}
