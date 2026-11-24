import { Platform } from 'react-native';
import { readLocalValue, writeLocalValue } from '../offline/kvStore';
import { uuidv4 } from '../utils/uuid';

/**
 * Legacy installation identity, preserved in kv_store. It does not replace
 * the native enrolled device identity or grant signed-sync authority.
 * A storage failure must not silently generate a new identity.
 */

const STORAGE_KEY = 'roadguard.device-id';

let cachedDeviceId: string | null = null;

function readStored(): string | null {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(STORAGE_KEY) : null;
  }
  return readLocalValue(STORAGE_KEY);
}

function persist(value: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(STORAGE_KEY, value);
    return;
  }
  writeLocalValue(STORAGE_KEY, value);
}

/** Trả về `deviceId` ổn định của lần cài đặt này. */
export function getDeviceId(): string {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  const stored = readStored();
  if (stored) {
    cachedDeviceId = stored;
    return stored;
  }

  const generated = uuidv4();
  persist(generated);
  cachedDeviceId = generated;
  return generated;
}
