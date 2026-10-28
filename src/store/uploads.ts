import { create } from 'zustand';
import { AppState, type AppStateStatus } from 'react-native';
import { File } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';
import { openDatabase } from '../offline/database';
import { uuidv4 } from '../utils/uuid';
import {
  MAX_PHOTO_BYTES,
  PART_SIZE_BYTES,
  computePollBackoffMs,
  httpUploadTransport,
  parseFileStatus,
  planUploadParts,
  sha256HexOfBytes,
  uploadErrorCode,
  isReporterSession,
} from '../api/uploads';
import { useAuthStore } from './auth';
import type {
  CompletedUploadPartDto,
  LocationSource,
  UploadPartUrlResponseDto,
  UploadTransport,
} from '../api/uploads';
import { hasUsableCoordinate } from '../types/position';

import { apiClient } from '../api/client';
import { passwordSessionIdentity } from '../api/authApi';

let reporterContextEpoch = 0;
/** Continuity/provenance only; never grants authority. No token is persisted. */
export function reporterContext() {
  const auth = useAuthStore.getState();
  const environment = apiClient.defaults.baseURL ?? '';
  const ownerId = isReporterSession(auth) ? auth.user!.id : null;
  const session = ownerId ? passwordSessionIdentity(auth.token) : null;
  if (ownerId && (!session || JSON.parse(session)[0] !== ownerId)) throw { code: 'auth_unauthorized', status: 401 };
  return { ownerId, environment, session, epoch: reporterContextEpoch,
    partition: `reporter-v2:${JSON.stringify([environment, ownerId, session])}` };
}
export function assertReporterContext(context: ReturnType<typeof reporterContext>) {
  const live = reporterContext();
  if (live.partition !== context.partition || live.epoch !== context.epoch) throw { code: 'auth_unauthorized', status: 401 };
}
function requestedPartition(requested?: string) {
  const context = reporterContext();
  // Existing capture/upload callers supply actor hints, never a storage provenance.
  if (requested && requested !== context.partition && requested !== `reporter-${context.ownerId ?? 'guest'}`)
    throw { code: 'access_forbidden', status: 403 };
  return context;
}

/**
 * Hàng đợi upload ảnh private của Reporter (RPT-05/RPT-06).
 *
 * Vòng đời lấy đúng `media_state` của `src/offline/schema.sql`
 * (LOCAL_READY → SESSION_CREATED → UPLOADING → COMPLETE_REQUESTED → VERIFYING → VERIFIED, kèm FAILED).
 *
 * Ledger nằm trong SQLite và phân vùng theo tài khoản: mọi bước trung gian (session id, file id,
 * checksum, ETag từng part, version) đều ghi xuống đĩa để resume qua API-212 sau khi app bị kill.
 */

// Guard every authenticated call, including foreground/background queue entry points.
export const uploadTransport: UploadTransport = Object.fromEntries(
  Object.entries(httpUploadTransport).map(([name, method]) => [name, (...args: unknown[]) => {
    if (!isReporterSession(useAuthStore.getState())) throw { code: 'auth_unauthorized', status: 401 };
    return (method as (...values: unknown[]) => unknown)(...args);
  }]),
) as unknown as UploadTransport;

export type UploadMediaState =
  | 'LOCAL_READY'
  | 'SESSION_CREATED'
  | 'UPLOADING'
  | 'COMPLETE_REQUESTED'
  | 'VERIFYING'
  | 'VERIFIED'
  | 'FAILED';

export const UPLOAD_STATE_LABELS: Record<UploadMediaState, string> = {
  LOCAL_READY: 'Chờ tải lên',
  SESSION_CREATED: 'Đã mở phiên tải',
  UPLOADING: 'Đang tải lên',
  COMPLETE_REQUESTED: 'Chờ máy chủ xác minh',
  VERIFYING: 'Đang xác minh toàn vẹn',
  VERIFIED: 'Đã xác minh',
  FAILED: 'Tải lên thất bại',
};

export interface UploadQueueItem {
  id: string;
  partitionId: string;
  uriLocal: string;
  fileName: string;
  mediaType: string;
  sizeBytes: number;
  checksumSha256: string;
  mediaState: UploadMediaState;
  uploadId: string | null;
  fileId: string | null;
  sessionVersion: string | null;
  partSizeBytes: number;
  /** partNumber (chuỗi) → ETag do storage trả về */
  partETags: Record<string, string>;
  serverStatus: string | null;
  verifiedVersion: string | null;
  attempt: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  locationSource: LocationSource;
  latitude: number | null;
  longitude: number | null;
  /** Bán kính sai số GPS (mét, 68%); `null` khi thiết bị không cung cấp. */
  accuracyMeters: number | null;
  capturedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnqueuePhotoInput {
  uriLocal: string;
  fileName: string;
  mediaType: string;
  sizeBytes: number;
  checksumSha256: string;
  capturedAt?: string;
  locationSource?: LocationSource;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
  partitionId?: string;
}

export function isTerminalMediaState(state: UploadMediaState): boolean {
  return state === 'VERIFIED' || state === 'FAILED';
}

/** Tỉ lệ byte đã tải lên theo số part đã có ETag. */
export function uploadedRatio(item: UploadQueueItem): number {
  if (item.sizeBytes <= 0) {
    return 0;
  }
  const parts = planUploadParts(item.sizeBytes, item.partSizeBytes);
  if (parts.length === 0) {
    return 0;
  }
  const done = parts.filter((part) => Boolean(item.partETags[String(part.partNumber)])).length;
  return done / parts.length;
}

const UPLOAD_LEDGER_DDL = `
CREATE TABLE IF NOT EXISTS upload_ledger (
  id                TEXT PRIMARY KEY,
  partition_id      TEXT NOT NULL,
  uri_local         TEXT NOT NULL,
  file_name         TEXT NOT NULL,
  media_type        TEXT NOT NULL,
  size_bytes        INTEGER NOT NULL,
  checksum_sha256   TEXT NOT NULL,
  media_state       TEXT NOT NULL,
  upload_id         TEXT,
  file_id           TEXT,
  session_version   TEXT,
  part_size_bytes   INTEGER NOT NULL,
  part_etags        TEXT NOT NULL DEFAULT '{}',
  server_status     TEXT,
  verified_version  TEXT,
  attempt           INTEGER NOT NULL DEFAULT 0,
  last_error_code   TEXT,
  last_error_message TEXT,
  location_source   TEXT NOT NULL DEFAULT 'UNKNOWN',
  latitude          REAL,
  longitude         REAL,
  accuracy_meters   REAL,
  captured_at       TEXT NOT NULL,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_upload_ledger_partition
  ON upload_ledger (partition_id, media_state, created_at ASC);`;

interface UploadLedgerRow {
  id: string;
  partition_id: string;
  uri_local: string;
  file_name: string;
  media_type: string;
  size_bytes: number;
  checksum_sha256: string;
  media_state: string;
  upload_id: string | null;
  file_id: string | null;
  session_version: string | null;
  part_size_bytes: number;
  part_etags: string;
  server_status: string | null;
  verified_version: string | null;
  attempt: number;
  last_error_code: string | null;
  last_error_message: string | null;
  location_source: string;
  latitude: number | null;
  longitude: number | null;
  accuracy_meters: number | null;
  captured_at: string;
  created_at: string;
  updated_at: string;
}

let database: SQLiteDatabase | null = null;

/**
 * Bổ sung cột thêm sau cho ledger đã tạo từ bản cũ (Phần 2): ledger cũ thiếu `accuracy_meters`.
 * `CREATE TABLE IF NOT EXISTS` không tự thêm cột nên phải migrate thủ công, idempotent.
 */
async function migrateLedger(db: SQLiteDatabase): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(upload_ledger)');
  if (!columns.some((column) => column.name === 'accuracy_meters')) {
    await db.execAsync('ALTER TABLE upload_ledger ADD COLUMN accuracy_meters REAL');
  }
}

async function ledger(): Promise<SQLiteDatabase> {
  if (!database) {
    const opened = openDatabase();
    await opened.execAsync(UPLOAD_LEDGER_DDL);
    await migrateLedger(opened);
    database = opened;
  }
  return database;
}

function parsePartETags(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function toMediaState(raw: string): UploadMediaState {
  return raw in UPLOAD_STATE_LABELS ? (raw as UploadMediaState) : 'LOCAL_READY';
}

function mapRow(row: UploadLedgerRow): UploadQueueItem {
  return {
    id: row.id,
    partitionId: row.partition_id,
    uriLocal: row.uri_local,
    fileName: row.file_name,
    mediaType: row.media_type,
    sizeBytes: row.size_bytes,
    checksumSha256: row.checksum_sha256,
    mediaState: toMediaState(row.media_state),
    uploadId: row.upload_id,
    fileId: row.file_id,
    sessionVersion: row.session_version,
    partSizeBytes: row.part_size_bytes,
    partETags: parsePartETags(row.part_etags),
    serverStatus: row.server_status,
    verifiedVersion: row.verified_version,
    attempt: row.attempt,
    lastErrorCode: row.last_error_code,
    lastErrorMessage: row.last_error_message,
    locationSource: row.location_source as LocationSource,
    latitude: row.latitude,
    longitude: row.longitude,
    accuracyMeters: row.accuracy_meters,
    capturedAt: row.captured_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function persistItem(item: UploadQueueItem): Promise<void> {
  const db = await ledger();
  await db.runAsync(
    `INSERT OR REPLACE INTO upload_ledger (
      id, partition_id, uri_local, file_name, media_type, size_bytes, checksum_sha256,
      media_state, upload_id, file_id, session_version, part_size_bytes, part_etags,
      server_status, verified_version, attempt, last_error_code, last_error_message,
      location_source, latitude, longitude, accuracy_meters, captured_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    item.id,
    item.partitionId,
    item.uriLocal,
    item.fileName,
    item.mediaType,
    item.sizeBytes,
    item.checksumSha256,
    item.mediaState,
    item.uploadId,
    item.fileId,
    item.sessionVersion,
    item.partSizeBytes,
    JSON.stringify(item.partETags),
    item.serverStatus,
    item.verifiedVersion,
    item.attempt,
    item.lastErrorCode,
    item.lastErrorMessage,
    item.locationSource,
    item.latitude,
    item.longitude,
    item.accuracyMeters,
    item.capturedAt,
    item.createdAt,
    item.updatedAt,
  );
}

async function loadItems(partitionId: string): Promise<UploadQueueItem[]> {
  const db = await ledger();
  const rows = await db.getAllAsync<UploadLedgerRow>(
    `SELECT * FROM upload_ledger WHERE partition_id = ? ORDER BY created_at ASC`,
    partitionId,
  );
  return rows.map(mapRow);
}

async function readPhotoBytes(uri: string): Promise<Uint8Array> {
  const file = new File(uri);
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

type ItemPatch = Partial<UploadQueueItem>;
type ItemUpdater = (patch: ItemPatch) => Promise<UploadQueueItem>;

/** Bước 2→6 của 03_Private-Photo-Upload.md. Idempotent: chạy lại sẽ resume từ part còn thiếu. */
async function runPipeline(item: UploadQueueItem, update: ItemUpdater, transport: UploadTransport): Promise<UploadQueueItem> {
  if (item.mediaState === 'COMPLETE_REQUESTED' || item.mediaState === 'VERIFYING') {
    const checked = await pollVerification(item, update, transport);
    if (checked.mediaState === 'VERIFIED' || checked.mediaState === 'FAILED') return checked;
    const session = await transport.getSession(item.uploadId!);
    if (['VERIFYING', 'VERIFIED', 'COMPLETED'].includes(session.status?.toUpperCase() ?? '')) return checked;
    // Unknown complete outcome: replay the frozen command, never adopt a new precondition.
    const parts = planUploadParts(item.sizeBytes, item.partSizeBytes).map(part => ({
      partNumber: part.partNumber, eTag: item.partETags[String(part.partNumber)],
    }));
    await transport.completeUpload(item.uploadId!, { parts, checksumSha256: item.checksumSha256 },
      item.sessionVersion!, `complete:${item.id}:${item.checksumSha256}`);
    return update({ mediaState: 'VERIFYING' });
  }
  const bytes = await readPhotoBytes(item.uriLocal);
  if (bytes.byteLength <= 0) {
    throw { code: 'upload_validation_failed', message: 'Tệp ảnh rỗng, vui lòng chụp lại.' };
  }
  if (bytes.byteLength > MAX_PHOTO_BYTES) {
    throw { code: 'upload_validation_failed', message: 'Ảnh vượt quá 20 MiB.' };
  }

  const checksum = await sha256HexOfBytes(bytes);
  let current = item;
  if (current.sizeBytes !== bytes.byteLength || current.checksumSha256 !== checksum) {
    if (current.uploadId || current.attempt > 0) {
      throw { code: 'upload_bytes_changed', message: 'Ảnh đã thay đổi. Giữ nguyên phiên cũ; vui lòng chọn lại ảnh cho một lần gửi mới.' };
    }
    current = await update({ sizeBytes: bytes.byteLength, checksumSha256: checksum });
  }

  if (!current.uploadId || !current.fileId) {
    const created = await transport.createSession(
      {
        fileName: current.fileName,
        mediaType: current.mediaType,
        sizeBytes: bytes.byteLength,
        checksumSha256: checksum,
      },
      `create:${current.id}:${checksum}`,
    );
    current = await update({
      uploadId: created.id,
      fileId: created.fileId,
      sessionVersion: created.version,
      serverStatus: created.status,
      mediaState: 'SESSION_CREATED',
      partSizeBytes: created.partSizeBytes,
    });
  }

  if (!current.uploadId || !current.fileId) {
    throw { code: 'upload_validation_failed', message: 'Thiếu phiên tải lên.' };
  }
  const uploadId = current.uploadId;

  if (current.mediaState === 'COMPLETE_REQUESTED' || current.mediaState === 'VERIFYING') {
    return current;
  }

  const parts = planUploadParts(bytes.byteLength, current.partSizeBytes);
  const missingParts = parts.filter((part) => !current.partETags[String(part.partNumber)]);
  if (missingParts.length > 0) {
    const previousExpiry = current.partETags._urlsExpireAt;
    if (!current.partETags._urlsKey || (previousExpiry && Date.parse(previousExpiry) <= Date.now())) {
      current = await update({ partETags: { ...current.partETags, _urlsKey: uuidv4(), _urlsExpireAt: '' } });
    }
    const urlsResponse = await transport.requestPartUrls(
      uploadId,
      { partNumbers: parts.map((part) => part.partNumber) },
      current.partETags._urlsKey,
    );
    const expiries = (urlsResponse.parts ?? []).map(part => part.expiresAt).filter((v): v is string => Boolean(v));
    if (expiries.length) current = await update({ partETags: { ...current.partETags, _urlsExpireAt: expiries.sort()[0] } });
    const urlByPartNumber = new Map<number, UploadPartUrlResponseDto>();
    for (const part of urlsResponse.parts ?? []) {
      if (typeof part.partNumber === 'number') {
        urlByPartNumber.set(part.partNumber, part);
      }
    }
    for (const range of missingParts) {
      const partUrl = urlByPartNumber.get(range.partNumber);
      if (!partUrl?.url) {
        throw {
          code: 'upload_storage_unavailable',
          message: 'Không lấy được URL tải lên cho một phần của ảnh.',
        };
      }
      const stored = await transport.putPart(
        partUrl,
        bytes.subarray(range.start, range.end),
        current.mediaType,
      );
      current = await update({
        partETags: { ...current.partETags, [String(range.partNumber)]: stored.eTag },
        mediaState: 'UPLOADING',
      });
    }
  }

  const completedParts: CompletedUploadPartDto[] = parts.map((part) => ({
    partNumber: part.partNumber,
    eTag: current.partETags[String(part.partNumber)],
  }));
  if (completedParts.some((part) => !part.eTag)) {
    throw { code: 'upload_validation_failed', message: 'Thiếu ETag của một số phần ảnh.' };
  }

  const session = await transport.getSession(uploadId);
  if (!session.version) throw { code: 'precondition_required', status: 428 };
  current = await update({ sessionVersion: session.version, mediaState: 'COMPLETE_REQUESTED' });
  const completed = await transport.completeUpload(
    uploadId,
    { parts: completedParts, checksumSha256: checksum },
    current.sessionVersion ?? '',
    `complete:${current.id}:${checksum}`,
  );
  return update({
    mediaState: 'COMPLETE_REQUESTED',
    serverStatus: completed.status,
  });
}

/** Bước 7: poll API-208 tới khi terminal. `UNKNOWN` KHÔNG được coi là xong. */
async function pollVerification(item: UploadQueueItem, update: ItemUpdater, transport: UploadTransport): Promise<UploadQueueItem> {
  if (!item.fileId) {
    throw { code: 'upload_validation_failed', message: 'Thiếu mã tệp để xác minh.' };
  }
  const metadata = await transport.getFileMetadata(item.fileId);
  const status = parseFileStatus(metadata.status);
  if (status === 'VERIFIED' && metadata.id === item.fileId && metadata.version &&
      metadata.checksumSha256 === item.checksumSha256 && metadata.sizeBytes === item.sizeBytes) {
    return update({
      mediaState: 'VERIFIED',
      serverStatus: metadata.status,
      verifiedVersion: metadata.version,
      lastErrorCode: null,
      lastErrorMessage: null,
    });
  }
  if (status === 'FAILED') {
    return update({
      mediaState: 'FAILED',
      serverStatus: metadata.status,
      lastErrorCode: 'upload_validation_failed',
      lastErrorMessage: 'Máy chủ từ chối tệp sau khi xác minh. Vui lòng tải lại ảnh.',
    });
  }
  return update({ mediaState: 'VERIFYING', serverStatus: metadata.status });
}

interface UploadsState {
  partitionId: string;
  hydrated: boolean;
  items: UploadQueueItem[];
  busyItemIds: string[];
  watching: boolean;
  setPartition(partitionId: string): void;
  hydrate(partitionId?: string): Promise<void>;
  enqueuePhoto(input: EnqueuePhotoInput): Promise<string>;
  advanceItem(id: string): Promise<void>;
  advanceAll(): Promise<void>;
  retryItem(id: string): Promise<void>;
  removeItem(id: string): Promise<void>;
  allVerified(): boolean;
  startWatch(): void;
  stopWatch(): void;
}

let watchTimer: ReturnType<typeof setTimeout> | null = null;
let watchSubscription: { remove: () => void } | null = null;
let watchAttempt = 0;

function clearWatchTimer(): void {
  if (watchTimer) {
    clearTimeout(watchTimer);
    watchTimer = null;
  }
}

export const useUploadsStore = create<UploadsState>()((set, get) => ({
  partitionId: '',
  hydrated: false,
  items: [],
  busyItemIds: [],
  watching: false,

  setPartition(partitionId) {
    const context = requestedPartition(partitionId);
    set({ partitionId: context.partition, items: [], hydrated: false });
    void get().hydrate(context.partition);
  },

  async hydrate(partitionId) {
    const context = requestedPartition(partitionId);
    const target = context.partition;
    set({ partitionId: target, hydrated: false });
    const items = await loadItems(target);
    assertReporterContext(context);
    if (get().partitionId === target) set({ items, hydrated: true });
  },

  async enqueuePhoto(input) {
    const context = requestedPartition(input.partitionId);
    const now = new Date().toISOString();
    // Toạ độ rác (0,0) hoặc không hợp lệ → bỏ hẳn, ép nguồn UNKNOWN (KHÔNG bịa GPS).
    const usable = hasUsableCoordinate(input.latitude, input.longitude);
    const accuracy =
      usable && typeof input.accuracyMeters === 'number' && Number.isFinite(input.accuracyMeters)
        ? input.accuracyMeters
        : null;
    const item: UploadQueueItem = {
      id: uuidv4(),
      partitionId: context.partition,
      uriLocal: input.uriLocal,
      fileName: input.fileName,
      mediaType: input.mediaType,
      sizeBytes: input.sizeBytes,
      checksumSha256: input.checksumSha256,
      mediaState: 'LOCAL_READY',
      uploadId: null,
      fileId: null,
      sessionVersion: null,
      partSizeBytes: PART_SIZE_BYTES,
      partETags: {},
      serverStatus: null,
      verifiedVersion: null,
      attempt: 0,
      lastErrorCode: null,
      lastErrorMessage: null,
      locationSource: usable ? input.locationSource ?? 'UNKNOWN' : 'UNKNOWN',
      latitude: usable ? input.latitude ?? null : null,
      longitude: usable ? input.longitude ?? null : null,
      accuracyMeters: accuracy,
      capturedAt: input.capturedAt ?? now,
      createdAt: now,
      updatedAt: now,
    };
    assertReporterContext(context);
    await persistItem(item);
    assertReporterContext(context);
    set((state) => ({ items: [...state.items, item] }));
    return item.id;
  },

  async advanceItem(id) {
    const start = get().items.find((item) => item.id === id);
    const auth = useAuthStore.getState();
    if (!isReporterSession(auth) || !start) return;
    const context = reporterContext();
    if (start.partitionId !== context.partition || get().partitionId !== context.partition) return;
    if (start.mediaState === 'FAILED') {
      return;
    }
    if (get().busyItemIds.includes(id)) {
      return;
    }
    set((state) => ({ busyItemIds: [...state.busyItemIds, id] }));

    const update: ItemUpdater = async (patch) => {
      assertReporterContext(context);
      if (get().partitionId !== start.partitionId) throw { status: 401 };
      const latest = get().items.find((item) => item.id === id) ?? start;
      const next: UploadQueueItem = { ...latest, ...patch, updatedAt: new Date().toISOString() };
      await persistItem(next);
      assertReporterContext(context);
      if (get().partitionId !== start.partitionId) throw { status: 401 };
      set((state) => ({ items: state.items.map((item) => (item.id === id ? next : item)) }));
      return next;
    };

    const transport = Object.fromEntries(Object.entries(uploadTransport).map(([name, method]) => [name, async (...args: unknown[]) => {
      assertReporterContext(context);
      if (get().partitionId !== start.partitionId) throw { status: 401, code: 'auth_unauthorized' };
      const result = await (method as (...values: unknown[]) => unknown)(...args);
      assertReporterContext(context);
      return result;
    }])) as unknown as UploadTransport;
    try {
      let current = start.mediaState === 'VERIFIED' ? await pollVerification(start, update, transport) : await runPipeline(start, update, transport);
      if (current.mediaState === 'COMPLETE_REQUESTED' || current.mediaState === 'VERIFYING') {
        await pollVerification(current, update, transport);
      }
    } catch (error) {
      const latest = get().items.find(item => item.id === id) ?? start;
      const status = (error as { response?: { status?: number }; status?: number }).response?.status ?? (error as { status?: number }).status;
      await update({
        mediaState: status && [400, 403, 409, 412, 422, 428].includes(status) ? 'FAILED' : latest.mediaState,
        attempt: start.attempt + 1,
        lastErrorCode: uploadErrorCode(error) ?? 'upload_validation_failed',
        lastErrorMessage:
          status === 401 ? 'Vui lòng đăng nhập lại để tiếp tục tải ảnh.' :
          status === 412 ? 'Phiên tải đã thay đổi. Cần kiểm tra phiên bản trước khi gửi lại.' :
          status === 403 ? 'Tài khoản không có quyền tải ảnh này.' :
          status === 428 ? 'Thiếu điều kiện gửi. Nháp được giữ nguyên.' :
          'Chưa xác nhận kết quả tải ảnh. Thử lại để kiểm tra, giữ nguyên phiên và khóa lệnh.',
      }).catch(() => undefined);
    } finally {
      set((state) => ({ busyItemIds: state.busyItemIds.filter((itemId) => itemId !== id) }));
    }
  },

  async advanceAll() {
    const ids = get()
      .items.filter((item) => !isTerminalMediaState(item.mediaState))
      .map((item) => item.id);
    for (const id of ids) {
      await get().advanceItem(id);
    }
  },

  async retryItem(id) {
    const current = get().items.find((item) => item.id === id);
    if (!current || current.mediaState !== 'FAILED') {
      return;
    }
    // A terminal rejection needs explicit correction. Retain its diagnostic and command.
    return;
  },

  async removeItem(id) {
    const context = reporterContext();
    const item = get().items.find(item => item.id === id);
    if (!item || item.partitionId !== context.partition) return;
    if (get().busyItemIds.includes(id)) {
      return;
    }
    const db = await ledger();
    assertReporterContext(context);
    await db.runAsync(`DELETE FROM upload_ledger WHERE id = ? AND partition_id = ?`, id, context.partition);
    assertReporterContext(context);
    set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
  },

  allVerified() {
    const { items } = get();
    return items.length > 0 && items.every((item) => item.mediaState === 'VERIFIED');
  },

  startWatch() {
    if (get().watching) {
      return;
    }
    set({ watching: true });
    watchAttempt = 0;
    watchSubscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'active') {
        watchAttempt = 0;
        void watchTick();
      } else {
        clearWatchTimer();
      }
    });
    void watchTick();
  },

  stopWatch() {
    clearWatchTimer();
    if (watchSubscription) {
      watchSubscription.remove();
      watchSubscription = null;
    }
    set({ watching: false });
  },
}));

useAuthStore.subscribe?.((state, previous) => {
  if (state.user?.id !== previous.user?.id || passwordSessionIdentity(state.token) !== passwordSessionIdentity(previous.token) ||
      isReporterSession(state) !== isReporterSession(previous)) {
    reporterContextEpoch++;
    useUploadsStore.getState().stopWatch();
    useUploadsStore.setState({ items: [], hydrated: false, partitionId: '', busyItemIds: [] });
  }
});

/** Một nhịp poll: chỉ chạy khi app đang foreground, dừng hẳn khi mọi ảnh đã terminal. */
async function watchTick(): Promise<void> {
  const store = useUploadsStore.getState();
  if (!store.watching) {
    return;
  }
  await store.advanceAll();

  const latest = useUploadsStore.getState();
  const hasPending = latest.items.some((item) => !isTerminalMediaState(item.mediaState));
  if (!hasPending) {
    latest.stopWatch();
    return;
  }
  if (AppState.currentState !== 'active') {
    clearWatchTimer();
    return;
  }
  const delayMs = computePollBackoffMs(watchAttempt);
  watchAttempt += 1;
  clearWatchTimer();
  watchTimer = setTimeout(() => {
    void watchTick();
  }, delayMs);
}
