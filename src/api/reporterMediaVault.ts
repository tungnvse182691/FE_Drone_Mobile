import { File } from 'expo-file-system';
import { randomUUID } from 'expo-crypto';
import { offlineNative } from '../../modules/roadguard-offline-crypto';
import { openMediaVaultAccess, type MediaVaultIdentity, type MediaVaultReference } from '../offline/mediaVaultAccess';
import { useAuthStore } from '../store/auth';
import { apiClient } from './client';
import { passwordSessionIdentity } from './authApi';
import { isReporterSession, MAX_PHOTO_BYTES, sha256HexOfBytes } from './uploads';

export type ReporterVaultPhoto = {uri: string; sizeBytes?: number; checksumSha256?: string; vault?: MediaVaultReference};
function identity(): MediaVaultIdentity | null {
  const state=useAuthStore.getState(),session=passwordSessionIdentity(state.token);
  if (!isReporterSession(state) || !session || JSON.parse(session)[0]!==state.user?.id) return null;
  return {actor:state.user!.id,environment:apiClient.defaults.baseURL??'',role:'REPORTER',session};
}
async function withVault<T>(isCurrent:()=>boolean,run:(access:ReturnType<typeof openMediaVaultAccess>)=>Promise<T>):Promise<T> {
  const owner=identity();
  if (!owner || !offlineNative) throw Error('reporter_media_session_invalid');
  let invalid=false;
  const unsubscribe=useAuthStore.subscribe(()=>{if(JSON.stringify(identity())!==JSON.stringify(owner))invalid=true;});
  const current=()=>!invalid && isCurrent() && JSON.stringify(identity())===JSON.stringify(owner)?owner:null;
  try { return await run(openMediaVaultAccess(owner,current,{native:offlineNative,uuid:randomUUID,hash:sha256HexOfBytes})); }
  finally {unsubscribe();}
}
/** New private copies only. Originals/previews and historical references are retained. */
export async function sealReporterPhoto(photo:ReporterVaultPhoto,isCurrent:()=>boolean):Promise<MediaVaultReference|undefined> {
  // A guest has no authenticated account binding. Existing guest/Expo Go behavior
  // remains legacy storage; it is never described as encrypted or claimed later.
  if (!offlineNative || (!useAuthStore.getState().user && !useAuthStore.getState().token)) return undefined;
  if (!photo.sizeBytes || !photo.checksumSha256) throw Error('media_source_invalid');
  return withVault(isCurrent,access=>access.seal(photo.uri,{sizeBytes:photo.sizeBytes!,checksumSha256:photo.checksumSha256!}));
}
/** A recorded vault reference never falls back to plaintext, including lost keys. */
export async function readReporterPhotoBytes(photo:ReporterVaultPhoto,isCurrent:()=>boolean=()=>true):Promise<Uint8Array> {
  const ref=photo.vault===undefined?undefined:{...photo.vault};
  if (ref!==undefined) {
    if(ref.sizeBytes!==photo.sizeBytes || ref.checksumSha256!==photo.checksumSha256)throw Error('media_reference_invalid');
    return withVault(isCurrent,access=>access.readAll(ref,MAX_PHOTO_BYTES));
  }
  if(!isCurrent())throw Error('media_session_changed');
  const file=new File(photo.uri);
  if(file.exists===false)throw {code:'local_photo_missing',stage:'local_read'};
  if(typeof file.size==='number' && (file.size<=0 || file.size>MAX_PHOTO_BYTES))throw {code:'validation_error',status:400,stage:'local_read'};
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(!isCurrent()){bytes.fill(0);throw Error('media_session_changed');}
  return bytes;
}
