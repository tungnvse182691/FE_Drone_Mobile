import { randomUUID } from 'expo-crypto';
import { offlineNative } from '../../modules/roadguard-offline-crypto';
import { openMediaVaultAccess, type MediaVaultIdentity, type MediaVaultReference } from '../offline/mediaVaultAccess';
import { useAuthStore } from '../store/auth';
import { passwordSessionIdentity } from './authApi';
import { apiClient } from './client';
import { sha256HexOfBytes } from './uploads';

type Owner = { actor: string; environment: string };
type Photo = { uri: string; size: number; checksum: string; vault?: MediaVaultReference };
function identity(owner: Owner): MediaVaultIdentity | null {
  const state = useAuthStore.getState(), session = passwordSessionIdentity(state.token);
  if (!session || !state.user || state.user.role_code !== 'REPAIR_CREW' || state.user.must_change_password ||
      !['AUTHENTICATED','REFRESHING'].includes(state.status) || JSON.parse(session)[0] !== state.user.id ||
      state.user.id !== owner.actor || apiClient.defaults.baseURL !== owner.environment) return null;
  return { actor: owner.actor, environment: owner.environment, role: 'REPAIR_CREW', session };
}
async function withVault<T>(owner: Owner, isCurrent: () => boolean,
  run: (access: ReturnType<typeof openMediaVaultAccess>) => Promise<T>): Promise<T> {
  const source = identity(owner);
  if (!source || !offlineNative) throw Error('crew_media_session_invalid');
  let invalid = false;
  const unsubscribe = useAuthStore.subscribe(() => {
    if (JSON.stringify(identity(owner)) !== JSON.stringify(source)) invalid = true;
  });
  const current = () => !invalid && isCurrent() && JSON.stringify(identity(owner)) === JSON.stringify(source) ? source : null;
  try {
    return await run(openMediaVaultAccess(source,current,{native:offlineNative,uuid:randomUUID,hash:sha256HexOfBytes}));
  } finally { unsubscribe(); }
}
/** Seal new copies only. Preserve originals and historical drafts for recovery. */
export async function sealCrewPhoto(owner: Owner, photo: Photo, isCurrent: () => boolean): Promise<MediaVaultReference | undefined> {
  // Missing providers retain the existing custody path without an encryption claim.
  // A present provider must succeed; errors never silently downgrade storage.
  if (!offlineNative) return undefined;
  return withVault(owner,isCurrent,access => access.seal(photo.uri,{sizeBytes:photo.size,checksumSha256:photo.checksum}));
}
/** Recorded references are authoritative for bytes, never for HTTP permissions. */
export async function readCrewPhotoBytes(owner: Owner, photo: Photo, isCurrent: () => boolean): Promise<Uint8Array> {
  const ref = photo.vault === undefined ? undefined : {...photo.vault};
  if (!ref || ref.sizeBytes !== photo.size || ref.checksumSha256 !== photo.checksum) throw Error('media_reference_invalid');
  return withVault(owner,isCurrent,access => access.readAll(ref,20 * 1024 * 1024));
}
