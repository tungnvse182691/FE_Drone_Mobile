/**
 * Sinh mã wire giả lập có hình dạng đúng BE (rowversion 8 byte → Base64 12 ký tự kết thúc `=`,
 * checksum SHA-256 hex 64 ký tự). Chỉ dùng cho mock offline-first.
 */

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function fakeRowVersion(seed: string, step = 0): string {
  let state = (hashSeed(seed) + step * 2654435761) >>> 0;
  let out = '';
  for (let i = 0; i < 11; i += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    out += B64_ALPHABET[state % 64];
  }
  return `${out}=`;
}

export function fakeSha256(seed: string): string {
  let state = hashSeed(seed) || 1;
  let out = '';
  for (let i = 0; i < 64; i += 1) {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    out += (state % 16).toString(16);
  }
  return out;
}
