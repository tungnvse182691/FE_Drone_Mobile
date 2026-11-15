import { fetch } from 'expo/fetch';

const STORAGE_CODES = new Set(['AccessDenied', 'SignatureDoesNotMatch', 'RequestExpired', 'ExpiredToken',
  'InvalidAccessKeyId', 'RequestTimeTooSkewed', 'InvalidToken', 'NoSuchUpload']);

/** Bounded, transient XML inspection. Never retain Message, Resource or signed URL. */
async function storageErrorCode(response: Response): Promise<string> {
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    reader = response.body?.getReader();
    if (!reader) return 'UNKNOWN';
    let xml = '', complete = false;
    for (let chunks = 0; chunks < 32; chunks++) {
      const { done, value } = await reader.read();
      if (done) { complete = true; break; }
      if (!value || xml.length + value.byteLength > 8192) return 'UNKNOWN';
      // S3 Code values and XML delimiters are ASCII; no body decoding/logging needed.
      for (const byte of value) xml += String.fromCharCode(byte);
    }
    if (!complete || !/^(?:<\?xml[^>]*>\s*)?<Error>[\s\S]*<\/Error>\s*$/.test(xml.trim())) return 'UNKNOWN';
    const codes = [...xml.matchAll(/<Code>([A-Za-z]+)<\/Code>/g)];
    return codes.length === 1 && STORAGE_CODES.has(codes[0][1]) ? codes[0][1] : 'UNKNOWN';
  } catch { return 'UNKNOWN'; }
  finally {
    // Diagnostic cleanup must not replace the original HTTP error or delay recovery.
    try { void reader?.cancel().catch(() => {}); } catch { /* already closed */ }
    try { reader?.releaseLock(); } catch { /* already released */ }
  }
}

/** Storage is a separate origin: never attach API credentials or log its URL. */
export async function putDroneStorageBytes(url: string, bytes: ArrayBuffer | Blob | Uint8Array, mediaType: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    // Expo accepts typed bytes directly; RN XHR otherwise base64 encodes them.
    const response = await fetch(url, {
      method: 'PUT', body: bytes as BodyInit, credentials: 'omit',
      headers: { 'Content-Type': mediaType }, signal: controller.signal,
    });
    if (!response.ok) throw Object.assign(new Error('drone_storage_part_rejected'), {
      response: { status: response.status }, storageCode: await storageErrorCode(response),
    });
    const etag = response.headers.get('etag');
    if (!etag?.trim()) throw Error('drone_upload_part_etag_missing');
    return etag;
  } finally { clearTimeout(timeout); }
}
