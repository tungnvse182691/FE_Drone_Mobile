import { requireOptionalNativeModule } from 'expo-modules-core';

export interface NativeCapability {
  available: boolean; apiLevel: number; signingUsable: boolean; agreementUsable: boolean;
  securityLevel: { signing: string; agreement: string }; reason: string;
}
interface NativeCrypto {
  readonly qaSoftwareEnabled?: boolean;
  qaCapability?(binding:string):Promise<NativeCapability>;
  qaCreateKeys?(binding:string):Promise<NativeCapability>;
  qaPublicKeys?(binding:string):Promise<{signingPublicKey:string;encryptionPublicKey:string}>;
  qaSignManifest?(binding:string,manifest:string):Promise<string>;
  /** Storage binding is [actorId, environment, role]. Separate from signed-sync keys/policy. */
  prepareMediaKey(binding: string): Promise<{available: boolean; securityLevel: string}>;
  sealMedia(binding: string, assetId: string, sourceUri: string): Promise<{
    version: 1; assetId: string; checksumSha256: string; sizeBytes: number;
  }>;
  /** At most 1 MiB, authenticated requested chunks only; never a VERIFIED receipt. */
  readMediaRange(binding: string, assetId: string, offset: number, length: number): Promise<string>;
  capability(binding: string): Promise<NativeCapability>;
  installationId(): Promise<string>;
  createKeys(binding: string): Promise<NativeCapability>;
  publicKeys(binding: string): Promise<{signingPublicKey:string;encryptionPublicKey:string}>;
  signManifest(binding: string, manifest: string): Promise<string>;
  verifyManifest(publicKey: string, manifest: string, signature: string): Promise<boolean>;
  /** Request binds header, canonical attached-payload bytes (base64), and independently verified recipient keys. */
  sealPackage(binding: string, request: string): Promise<string>;
  /** trustedSender must come from authenticated registration, never the imported envelope. */
  openPackage(binding: string, envelope: string, trustedSender: string): Promise<string>;
}
let native: NativeCrypto | null = null;
try { native = requireOptionalNativeModule<NativeCrypto>('RoadguardOfflineCrypto'); } catch { /* Expo Go/web: fail closed. */ }
export const offlineNative = native;
/** QA only: native enforces debuggable + emulator, separate aliases and loopback
 * sandbox binding again. Never enables production, handover or media key policy.
 */
export function offlineQaNativeFor(environment:string) {
  const n=native;
  if(!n?.qaSoftwareEnabled||!n.qaCapability||!n.qaCreateKeys||!n.qaPublicKeys||!n.qaSignManifest)return null;
  try {
    const u=new URL(environment);
    if(u.protocol!=='http:'||!['127.0.0.1','10.0.2.2','localhost'].includes(u.hostname)||u.port!=='18181'||u.pathname!=='/api/v1'||u.username||u.password||u.search||u.hash)return null;
  }catch{return null;}
  return {installationId:()=>n.installationId(),capability:(b:string)=>n.qaCapability!(b),createKeys:(b:string)=>n.qaCreateKeys!(b),
    publicKeys:(b:string)=>n.qaPublicKeys!(b),signManifest:(b:string,m:string)=>n.qaSignManifest!(b,m),
    verifyManifest:(p:string,m:string,s:string)=>n.verifyManifest(p,m,s)};
}
export const unavailableCapability: NativeCapability = { available:false,apiLevel:0,signingUsable:false,agreementUsable:false,
  securityLevel:{signing:'UNKNOWN',agreement:'UNKNOWN'},reason:'BLOCKED_NATIVE_MODULE_UNAVAILABLE' };
/** Compile-time acceptance gate stays closed until device/.NET interop + restart/custody evidence exists. */
export const NATIVE_ACCEPTANCE_VERIFIED = false;
