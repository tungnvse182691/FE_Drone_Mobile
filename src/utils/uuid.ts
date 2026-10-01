import * as Crypto from 'expo-crypto';

export function uuidv4(): string {
  return Crypto.randomUUID();
}

const stableKeys = new Map<string, string>();

export function stableUuid(scope: string): string {
  const existing = stableKeys.get(scope);
  if (existing) {
    return existing;
  }
  const created = uuidv4();
  stableKeys.set(scope, created);
  return created;
}

export function releaseStableUuid(scope: string): void {
  stableKeys.delete(scope);
}