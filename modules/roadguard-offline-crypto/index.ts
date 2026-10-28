import { requireOptionalNativeModule } from 'expo-modules-core';

export interface NativeCapability {
  available: boolean; apiLevel: number; signingUsable: boolean; agreementUsable: boolean;
  securityLevel: { signing: string; agreement: string }; reason: string;
}
interface NativeCrypto {
  capability(binding: string): Promise<NativeCapability>;
  installationId(): Promise<string>;
  createKeys(binding: string): Promise<NativeCapability>;
  publicKeys(binding: string): Promise<{signingPublicKey:string;encryptionPublicKey:string}>;
  signManifest(binding: string, manifest: string): Promise<string>;
  verifyManifest(publicKey: string, manifest: string, signature: string): Promise<boolean>;
}
let native: NativeCrypto | null = null;
try { native = requireOptionalNativeModule<NativeCrypto>('RoadguardOfflineCrypto'); } catch { /* Expo Go/web: fail closed. */ }
export const offlineNative = native;
export const unavailableCapability: NativeCapability = { available:false,apiLevel:0,signingUsable:false,agreementUsable:false,
  securityLevel:{signing:'UNKNOWN',agreement:'UNKNOWN'},reason:'BLOCKED_NATIVE_MODULE_UNAVAILABLE' };
/** Compile-time acceptance gate stays closed until device/.NET interop + restart/custody evidence exists. */
export const NATIVE_ACCEPTANCE_VERIFIED = false;
