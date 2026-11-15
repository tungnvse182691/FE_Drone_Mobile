import { fetch } from 'expo/fetch';

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
    if (!response.ok) throw Object.assign(new Error('drone_storage_part_rejected'), {response:{status:response.status}});
    const etag = response.headers.get('etag');
    if (!etag?.trim()) throw Error('drone_upload_part_etag_missing');
    return etag;
  } finally { clearTimeout(timeout); }
}
