import { base64ToBytes, bytesToBase64 } from '../utils/base64';

/** Local custody only. This identity never authorizes HTTP or signed sync. */
export interface MediaVaultIdentity {
  actor: string;
  environment: string;
  role: 'REPAIR_CREW' | 'DRONE_OPERATOR' | 'REPORTER';
  session: string;
}
/** Caller persists this in its encrypted draft before publishing the capture.
 * No key, token, session, native path or upload receipt belongs in a reference. */
export interface MediaVaultReference {
  version: 1;
  actor: string;
  environment: string;
  role: MediaVaultIdentity['role'];
  assetId: string;
  checksumSha256: string;
  sizeBytes: number;
}
interface MediaVaultPorts {
  native: {
    prepareMediaKey(binding: string): Promise<{available: boolean; securityLevel: string}>;
    sealMedia(binding: string, assetId: string, sourceUri: string): Promise<{
      version: 1; assetId: string; checksumSha256: string; sizeBytes: number;
    }>;
    readMediaRange(binding: string, assetId: string, offset: number, length: number): Promise<string>;
  };
  uuid(): string;
  hash(bytes: Uint8Array): Promise<string>;
}
const CHUNK = 1024 * 1024;
const uuid = (value: unknown): value is string => typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value) && value !== '00000000-0000-0000-0000-000000000000';
const hash = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const size = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;

/** Capture a session once. A new login needs a new accessor, even for the same actor.
 * Existing references remain account-bound, so a separately authorized new session
 * can reopen them after restart. There is no plaintext fallback or deletion API. */
export function openMediaVaultAccess(identity: MediaVaultIdentity, current: () => MediaVaultIdentity | null, ports: MediaVaultPorts) {
  const owner = { ...identity };
  let environment: URL;
  try { environment = new URL(owner.environment); } catch { throw Error('media_identity_invalid'); }
  if (!uuid(owner.actor) || !['REPAIR_CREW','DRONE_OPERATOR','REPORTER'].includes(owner.role) ||
      typeof owner.session !== 'string' || !owner.session || owner.session.length > 4096 ||
      owner.environment.length > 1800 || !['http:','https:'].includes(environment.protocol) || !environment.hostname ||
      environment.username || environment.password || environment.search || environment.hash) throw Error('media_identity_invalid');
  const binding = JSON.stringify([owner.actor,owner.environment,owner.role]);
  const guard = () => {
    const live = current();
    if (!live || live.actor !== owner.actor || live.environment !== owner.environment ||
        live.role !== owner.role || live.session !== owner.session) throw Error('media_session_changed');
  };
  const reference = (input: MediaVaultReference): MediaVaultReference => {
    const ref = { ...input };
    if (ref.version !== 1 || ref.actor !== owner.actor || ref.environment !== owner.environment || ref.role !== owner.role ||
        !uuid(ref.assetId) || !hash(ref.checksumSha256) || !size(ref.sizeBytes)) throw Error('media_reference_invalid');
    return ref;
  };
  const readRange = async (input: MediaVaultReference, offset: number, length: number): Promise<Uint8Array> => {
    guard(); const ref = reference(input);
    if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(length) || length < 1 ||
        length > CHUNK || offset > ref.sizeBytes - length) throw Error('media_range_invalid');
    const encoded = await ports.native.readMediaRange(binding,ref.assetId,offset,length); guard();
    if (typeof encoded !== 'string' || encoded.length !== Math.ceil(length / 3) * 4 ||
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) throw Error('media_bytes_invalid');
    const bytes = base64ToBytes(encoded);
    try {
      if (bytes.length !== length || bytesToBase64(bytes) !== encoded) throw Error('media_bytes_invalid');
      guard(); return bytes;
    } catch (error) { bytes.fill(0); throw error; }
  };
  return {
    seal: async (sourceUri: string, expected: {sizeBytes: number; checksumSha256: string}): Promise<MediaVaultReference> => {
      guard(); const source = { sizeBytes: expected.sizeBytes, checksumSha256: expected.checksumSha256 };
      if (typeof sourceUri !== 'string' || !sourceUri.startsWith('file:///') || !size(source.sizeBytes) || !hash(source.checksumSha256))
        throw Error('media_source_invalid');
      const assetId = ports.uuid();
      if (!uuid(assetId)) throw Error('media_reference_invalid');
      const capability = await ports.native.prepareMediaKey(binding); guard();
      if (capability.available !== true) throw Error('media_key_unavailable');
      const sealed = await ports.native.sealMedia(binding,assetId,sourceUri); guard();
      if (sealed.version !== 1 || sealed.assetId !== assetId || sealed.sizeBytes !== source.sizeBytes ||
          sealed.checksumSha256 !== source.checksumSha256) throw Error('media_source_changed');
      return Object.freeze({version:1,actor:owner.actor,environment:owner.environment,role:owner.role,assetId,...source});
    },
    readRange,
    /** Photos only or an explicitly bounded small file. Large videos use ranges.
     * Full checksum is verified here; a range alone never claims whole-file proof. */
    readAll: async (input: MediaVaultReference, maximumBytes: number): Promise<Uint8Array> => {
      guard(); const ref = reference(input);
      if (!size(maximumBytes) || maximumBytes > 20 * 1024 * 1024 || ref.sizeBytes > maximumBytes) throw Error('media_read_budget');
      const bytes = new Uint8Array(ref.sizeBytes);
      try {
        for (let offset = 0; offset < ref.sizeBytes; offset += CHUNK) {
          const chunk = await readRange(ref,offset,Math.min(CHUNK,ref.sizeBytes - offset));
          try { guard(); bytes.set(chunk,offset); } finally { chunk.fill(0); }
        }
        const actual = await ports.hash(bytes); guard();
        if (actual !== ref.checksumSha256) throw Error('media_checksum_changed');
        return bytes;
      } catch (error) { bytes.fill(0); throw error; }
    },
  };
}
