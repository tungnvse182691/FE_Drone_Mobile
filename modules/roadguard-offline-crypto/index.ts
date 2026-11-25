import { requireOptionalNativeModule } from 'expo-modules-core';

export interface NativeCapability {
  available: boolean; apiLevel: number; signingUsable: boolean; agreementUsable: boolean;
  securityLevel: { signing: string; agreement: string }; reason: string;
}
interface NativeCrypto {
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
export const unavailableCapability: NativeCapability = { available:false,apiLevel:0,signingUsable:false,agreementUsable:false,
  securityLevel:{signing:'UNKNOWN',agreement:'UNKNOWN'},reason:'BLOCKED_NATIVE_MODULE_UNAVAILABLE' };
/** Compile-time acceptance gate stays closed until device/.NET interop + restart/custody evidence exists. */
export const NATIVE_ACCEPTANCE_VERIFIED = false;
