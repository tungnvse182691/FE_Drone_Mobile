import * as FileSystem from 'expo-file-system/legacy';
import { randomUUID } from 'expo-crypto';
import { useAuthStore } from '../store/auth';
import { apiClient } from './client';
import { operatorVideoGuard, readOperatorVideos } from './operatorVideoReadback';

const STORAGE_RESERVE_BYTES = 64 * 1024 * 1024;
let occupied = false;
export type OperatorVideoLease = {
  videoUri: string;
  /** Stop and detach the native source synchronously, before cache deletion. */
  attachPlayer: (detach: () => void) => () => void;
  dispose: () => Promise<void>;
};

/** One preview only; dedicated disposable cache never references upload/draft/source directories. */
export async function downloadOperatorVideo(scope: string, taskId: string, projectId: string, datasetId: string, fileId: string,
  signal: AbortSignal, onProgress: (percent: number) => void): Promise<OperatorVideoLease> {
  if (occupied) throw Error('operator_video_busy');
  occupied = true;
  let directory: string | null = null, transfer: ReturnType<typeof FileSystem.createDownloadResumable> | undefined;
  let disposed = false, stopped = signal.aborted;
  let detachPlayer: (() => void) | undefined, disposal: Promise<void> | undefined;
  let guard: ReturnType<typeof operatorVideoGuard> | undefined;
  const cancel = () => { stopped = true; void transfer?.cancelAsync().catch(() => undefined); };
  const dispose = () => {
    if (disposal) return disposal;
    disposed = true;
    disposal = (async () => {
      // A failed detach keeps the file and cache lock: never delete a live source.
      detachPlayer?.(); detachPlayer = undefined;
      try { if (directory) await FileSystem.deleteAsync(directory, { idempotent: true }); }
      finally { occupied = false; }
    })();
    return disposal;
  };
  const attachPlayer = (detach: () => void) => {
    if (disposed || detachPlayer) throw Error('operator_video_lease_unavailable');
    let attached = true;
    const stop = () => { if (attached) { detach(); attached = false; detachPlayer = undefined; } };
    detachPlayer = stop;
    return stop;
  };
  const check = () => { guard?.check(); if (stopped || signal.aborted) throw Error('operator_video_cancelled'); };
  const authUnsubscribe = useAuthStore.subscribe(() => { try { guard?.check(); } catch { cancel(); } });
  signal.addEventListener('abort', cancel);
  // A large file may take longer than three minutes; expire stalled transfers only.
  let timeout = setTimeout(cancel, 180000), lastBytesWritten = 0;
  try {
    guard = operatorVideoGuard(scope); check();
    const detail = await readOperatorVideos(scope, taskId, projectId, datasetId); check();
    const file = detail.videos.find(source => source.fileId === fileId);
    if (!file) throw Error('operator_video_source_mismatch');
    const base = apiClient.defaults.baseURL, token = useAuthStore.getState().token;
    if (!base || !/^https?:\/\/[^@?#\s]+$/.test(base) || !token || !FileSystem.cacheDirectory) throw Error('operator_video_transport_invalid');
    const root = `${FileSystem.cacheDirectory}roadguard-operator-video-preview-v1/`;
    // Remove leftovers from a terminated app. This namespace contains previews only.
    await FileSystem.deleteAsync(root, { idempotent: true }); check();
    const freeBytes = await FileSystem.getFreeDiskStorageAsync(); check();
    if (!Number.isFinite(freeBytes) || freeBytes < file.sizeBytes + STORAGE_RESERVE_BYTES) throw Error('operator_video_storage_insufficient');
    directory = `${root}${randomUUID()}/`;
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true }); check();
    const videoUri = `${directory}video.mp4`;
    transfer = FileSystem.createDownloadResumable(`${base.replace(/\/$/, '')}/files/${encodeURIComponent(fileId)}/content`, videoUri,
      { headers: { Authorization: `Bearer ${token}` }, cache: false }, progress => {
        if (progress.totalBytesWritten > file.sizeBytes || progress.totalBytesExpectedToWrite > file.sizeBytes) { cancel(); return; }
        if (progress.totalBytesWritten > lastBytesWritten) {
          lastBytesWritten = progress.totalBytesWritten;
          clearTimeout(timeout); timeout = setTimeout(cancel, 180000);
        }
        try { check(); onProgress(Math.min(99, Math.floor(progress.totalBytesWritten * 100 / file.sizeBytes))); } catch { cancel(); }
      });
    const response = await transfer.downloadAsync(); check();
    if (!response || response.status !== 200) throw { response: { status: response?.status } };
    const mime = Object.entries(response.headers).find(([key]) => key.toLowerCase() === 'content-type')?.[1]?.split(';')[0].trim();
    const info = await FileSystem.getInfoAsync(videoUri); check();
    if (mime !== 'video/mp4' || !info.exists || info.isDirectory || info.size !== file.sizeBytes) throw Error('operator_video_bytes_invalid');
    // Recheck server authority after the potentially long transfer, before any playback.
    const current = await readOperatorVideos(scope, taskId, projectId, datasetId); check();
    const currentFile = current.videos.find(source => source.fileId === fileId);
    if (!currentFile || currentFile.sizeBytes !== file.sizeBytes || currentFile.checksumSha256 !== file.checksumSha256) throw Error('operator_video_source_changed');
    check(); onProgress(100);
    return { videoUri, attachPlayer, dispose };
  } catch (error) { await transfer?.cancelAsync().catch(() => undefined); await dispose(); throw error; }
  finally { clearTimeout(timeout); signal.removeEventListener('abort', cancel); authUnsubscribe(); guard?.close(); }
}
