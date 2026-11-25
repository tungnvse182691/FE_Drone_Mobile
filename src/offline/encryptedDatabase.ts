import type { SQLiteDatabase } from 'expo-sqlite';

const LEGACY = 'roadguard.db';
const ENCRYPTED = 'roadguard.encrypted.v1.db';
interface State { version: 1; phase: 'COPYING' | 'ACTIVE'; name: typeof ENCRYPTED; key: string }
export interface DatabaseProtectionPorts {
  /** Explicitly limited to Expo Go's separate sandbox; native builds fail closed. */
  allowPlaintext?: boolean;
  open(name: string): SQLiteDatabase;
  exists(name: string): boolean;
  /** Device-only SecureStore, never SQLite/AsyncStorage/log output. */
  read(): string | null;
  save(value: string): void;
  randomHex(): string;
}
const identifier = (s: string) => '"' + s.replace(/"/g, '""') + '"';
const literal = (s: string) => "'" + s.replace(/'/g, "''") + "'";
function parse(value: string): State {
  const s = JSON.parse(value);
  if (s?.version !== 1 || !['COPYING', 'ACTIVE'].includes(s.phase) || s.name !== ENCRYPTED ||
      typeof s.key !== 'string' || !/^[a-f0-9]{64}$/.test(s.key)) throw Error('invalid_state');
  return s;
}
function keyed(ports: DatabaseProtectionPorts, state: State): SQLiteDatabase {
  if (!ports.exists(state.name)) throw Error('encrypted_database_missing');
  const db = ports.open(state.name);
  try {
    db.execSync(`PRAGMA key = "x'${state.key}'"`);
    // Force key validation before callers receive any connection, including transactions.
    db.getFirstSync('SELECT count(*) AS n FROM sqlite_master');
    if (!db.getFirstSync('PRAGMA cipher_version')) throw Error('cipher_missing');
    return db;
  } catch (e) { db.closeSync(); throw e; }
}
function integrity(db: SQLiteDatabase): void {
  const rows = db.getAllSync<Record<string, unknown>>('PRAGMA integrity_check');
  if (rows.length !== 1 || Object.values(rows[0])[0] !== 'ok') throw Error('integrity_failed');
}
/** Compare schema and the complete row multiset (including blobs, NULLs and duplicate rows) inside SQLite. */
function verifyCopy(source: SQLiteDatabase): void {
  const schema = (name: string) => source.getAllSync<{type: string; name: string; tbl_name: string; sql: string | null}>(
    `SELECT type, name, tbl_name, sql FROM ${name}.sqlite_master WHERE name NOT LIKE 'sqlite_stat%' ORDER BY type, name`);
  const original = schema('main'), candidate = schema('encrypted');
  if (JSON.stringify(original) !== JSON.stringify(candidate)) throw Error('schema_mismatch');
  for (const table of original.filter(row => row.type === 'table')) {
    const cols = source.getAllSync<{name: string}>(`PRAGMA main.table_info(${identifier(table.name)})`).map(c => identifier(c.name));
    if (!cols.length) throw Error('unsupported_table');
    const selection = cols.join(', '), name = identifier(table.name);
    const rows = (database: string) => `SELECT ${selection}, count(*) AS __rg_multiplicity FROM ${database}.${name} GROUP BY ${selection}`;
    if (source.getFirstSync(`SELECT 1 FROM (${rows('main')} EXCEPT ${rows('encrypted')}) LIMIT 1`) ||
        source.getFirstSync(`SELECT 1 FROM (${rows('encrypted')} EXCEPT ${rows('main')}) LIMIT 1`)) throw Error('row_mismatch');
  }
}
/** App-owned adapter: Expo's default exclusive transaction opens a new, unkeyed connection. */
function protectedConnection(db: SQLiteDatabase, ports: DatabaseProtectionPorts, state: State): SQLiteDatabase {
  return new Proxy(db, {get(target, property) {
    if (property === 'withExclusiveTransactionAsync') return async (task: (tx: SQLiteDatabase) => Promise<void>) => {
      const tx = keyed(ports, state);
      let begun = false;
      try {
        await tx.execAsync('BEGIN'); begun = true;
        await task(tx);
        await tx.execAsync('COMMIT'); begun = false;
      } catch (e) {
        if (begun) { try { await tx.execAsync('ROLLBACK'); } catch { /* Keep original failure; never claim commit. */ } }
        throw e;
      } finally { await tx.closeAsync(); }
    };
    const value = Reflect.get(target, property, target);
    return typeof value === 'function' ? value.bind(target) : value;
  }});
}

/** Synchronous boot barrier: runs before any store/journal can borrow the owned DB handle.
 * The original is retained; no deletion, rekey-in-place, pending replay or server request.
 * A partially copied candidate is never overwritten or silently promoted.
 */
export function openProtectedDatabase(ports: DatabaseProtectionPorts): SQLiteDatabase {
  let stage = 'metadata-read';
  let source: SQLiteDatabase | undefined;
  let candidate: SQLiteDatabase | undefined;
  let attached = false, begun = false;
  try {
    const persisted = ports.read();
    let state = persisted === null ? null : parse(persisted);
    if (state?.phase === 'ACTIVE') return protectedConnection(keyed(ports, state), ports, state);
    stage = 'candidate-check';
    if (!state && ports.exists(ENCRYPTED)) throw Error('orphan_encrypted_database');
    // Opening a missing SQLite path creates an empty database. A saved COPYING
    // marker must therefore never manufacture a replacement for the source.
    if (state && !ports.exists(LEGACY)) throw Error('legacy_database_missing');
    const exportRequired = !ports.exists(ENCRYPTED);
    stage = 'legacy-open';
    source = ports.open(LEGACY);
    stage = 'cipher-probe';
    const cipher = source.getFirstSync('PRAGMA cipher_version');
    // Expo Go has a separate sandbox without SQLCipher. Never call this encrypted storage.
    if (!cipher) {
      if (state || !ports.allowPlaintext) throw Error('cipher_missing');
      const plain = source; source = undefined; return plain;
    }
    if (!state) {
      stage = 'key-create';
      const key = ports.randomHex();
      if (!/^[a-f0-9]{64}$/.test(key)) throw Error('key_generation_failed');
      state = {version: 1, phase: 'COPYING', name: ENCRYPTED, key};
      stage = 'metadata-save';
      ports.save(JSON.stringify(state));
    }
    // A crash immediately after SecureStore save has no candidate yet: resume
    // export with that same key. Existing candidates are only verified, never
    // overwritten, even if a previous export was interrupted.
    stage = 'source-header';
    const userVersion = source.getFirstSync<{user_version: number}>('PRAGMA user_version')?.user_version ?? 0;
    const applicationId = source.getFirstSync<{application_id: number}>('PRAGMA application_id')?.application_id ?? 0;
    if (!Number.isInteger(userVersion) || !Number.isInteger(applicationId)) throw Error('invalid_header');
    const candidatePath = source.databasePath.replace(/[^/\\]+$/, state.name);
    if (candidatePath === source.databasePath) throw Error('database_path_invalid');
    stage = 'candidate-attach';
    source.execSync(`ATTACH DATABASE ${literal(candidatePath)} AS encrypted KEY "x'${state.key}'"`);
    attached = true;
    source.execSync('BEGIN IMMEDIATE'); begun = true;
    if (exportRequired) {
      stage = 'candidate-export';
      source.getFirstSync("SELECT sqlcipher_export('encrypted')");
      source.execSync(`PRAGMA encrypted.user_version = ${userVersion}; PRAGMA encrypted.application_id = ${applicationId}`);
    }
    stage = 'candidate-compare';
    verifyCopy(source);
    source.execSync('COMMIT'); begun = false;
    source.execSync('DETACH DATABASE encrypted'); attached = false;
    stage = 'candidate-reopen';
    candidate = keyed(ports, state); integrity(candidate);
    if (candidate.getFirstSync<{user_version: number}>('PRAGMA user_version')?.user_version !== userVersion ||
        candidate.getFirstSync<{application_id: number}>('PRAGMA application_id')?.application_id !== applicationId) throw Error('header_mismatch');
    state = {...state, phase: 'ACTIVE'};
    stage = 'candidate-activate';
    ports.save(JSON.stringify(state));
    source.closeSync(); source = undefined;
    const result = protectedConnection(candidate, ports, state); candidate = undefined;
    return result;
  } catch {
    // SQL/key material and persisted values must never escape into crash logs.
    console.error('LOCAL_STORAGE_PROTECTION_UNAVAILABLE', stage);
    throw Error('LOCAL_STORAGE_PROTECTION_UNAVAILABLE');
  } finally {
    if (source) {
      if (begun) { try { source.execSync('ROLLBACK'); } catch { /* Preserve original. */ } }
      if (attached) { try { source.execSync('DETACH DATABASE encrypted'); } catch { /* Preserve original. */ } }
      try { source.closeSync(); } catch { /* Fail closed, no source deletion. */ }
    }
    if (candidate) { try { candidate.closeSync(); } catch { /* Fail closed. */ } }
  }
}
