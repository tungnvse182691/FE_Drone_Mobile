import { File } from 'expo-file-system';
import { throwMockApiError } from './mock/errors';
import { fakeRowVersion, fakeSha256 } from './mock/wire-ids';
import {
  PART_SIZE_BYTES,
  isValidChecksumSha256,
  sha256HexOfBytes,
  type CompletedUploadPartDto,
  type UploadCompleteRequestDto,
  type UploadPartUrlsResponseDto,
  type UploadSessionResponseDto,
} from './uploads';

/**
 * Transport tải lên dùng chung cho Operator (API-233/234/235/236).
 *
 * Nguồn sự thật:
 *  - docs/specs/04_API-Contracts/02_Full-API-Catalog.md (API-233 → API-236)
 *  - docs/specs/04_API-Contracts/03_DTO-and-Schema-Reference.md
 *    (`UploadCreateRequestDto`, `UploadSessionResponseDto`, `UploadPartUrlsRequestDto`,
 *     `UploadPartUrlsResponseDto`, `UploadCompleteRequestDto`)
 *  - docs/specs/04_API-Contracts/06_File-Upload-and-Evidence-Contracts.md
 *
 * Bất biến:
 *  1. API-233 cần `Idempotency-Key`; API-235 cần thêm `If-Match`.
 *  2. `complete` chỉ trả 202 "accepted" — KHÔNG đồng nghĩa tệp đã VERIFIED.
 *  3. PUT bytes lên presigned URL không gắn bearer RoadGuard.
 *  4. Không bịa `fileId`: chỉ cấp sau khi API-233 trả phiên hợp lệ.
 */

/** Mục đích upload theo `UploadCreateRequestDto` (admission theo purpose). */
export type OperatorUploadPurpose = 'SURVEY_VIDEO' | 'TELEMETRY';

export interface OperatorUploadCreateRequestDto {
  purpose: string;
  projectId?: string | null;
  targetId?: string | null;
  fileName: string;
  mediaType: string;
  sizeBytes?: number | null;
  checksumSha256: string;
}

export interface OperatorUploadResult {
  uploadId: string;
  fileId: string;
  status: string | null;
  checksumSha256: string;
  sizeBytes: number;
  parts: number;
}

interface MockUploadState {
  session: UploadSessionResponseDto;
  versionStep: number;
  checksumSha256: string;
  purpose: string;
  partCount: number;
}

const OPERATOR_UPLOAD_STATE = new Map<string, MockUploadState>();
const OPERATOR_UPLOAD_IDEMPOTENCY = new Map<string, { payload: string; response: unknown }>();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function uploadVersion(state: MockUploadState): string {
  return fakeRowVersion(`upload:${state.session.id}`, state.versionStep);
}

function uploadETag(state: MockUploadState): string {
  return `"${uploadVersion(state)}"`;
}

function sessionOf(state: MockUploadState): UploadSessionResponseDto {
  return { ...state.session, version: uploadVersion(state) };
}

function requireKey(key: string | undefined): string {
  // API-233/235/236 khai báo 428 với mã `validation_error` (không phải precondition_required).
  if (!key || key.trim().length === 0) {
    throwMockApiError('validation_error', {
      message: 'Thiếu Idempotency-Key cho lệnh tải lên.',
    });
  }
  return key.trim();
}

function requireOperatorPurpose(purpose: string): void {
  if (purpose !== 'SURVEY_VIDEO' && purpose !== 'TELEMETRY') {
    throwMockApiError('access_forbidden', {
      message: 'Mục đích tải lên không thuộc quyền của Phi công hiện trường.',
    });
  }
}

function assertUploadIfMatch(state: MockUploadState, ifMatch: string | undefined): void {
  if (!ifMatch || ifMatch.trim().length === 0) {
    throwMockApiError('validation_error', {
      message: 'Thiếu If-Match cho lệnh hoàn tất tải lên.',
    });
  }
  if (ifMatch.trim() !== uploadETag(state)) {
    throwMockApiError('auth_concurrency_conflict', {
      message: 'Phiên tải lên đã thay đổi, cần đọc lại trạng thái mới nhất.',
    });
  }
}

function findSession(uploadId: string): MockUploadState {
  const state = OPERATOR_UPLOAD_STATE.get(uploadId);
  if (!state) {
    throwMockApiError('upload_session_not_found', {
      message: 'Không tìm thấy phiên tải lên.',
    });
  }
  return state;
}

function replayGuard<T>(
  key: string,
  payload: string,
  build: () => T,
  store: (response: unknown) => unknown,
): T {
  const cached = OPERATOR_UPLOAD_IDEMPOTENCY.get(key);
  if (cached) {
    if (cached.payload === payload) {
      return cached.response as T;
    }
    throwMockApiError('duplicate_request', {
      message: 'Khoá idempotency đã dùng cho một lệnh tải lên khác.',
    });
  }
  const response = build();
  OPERATOR_UPLOAD_IDEMPOTENCY.set(key, { payload, response: store(response) ?? response });
  return response;
}

/** API-233 — tạo phiên tải lên. */
export async function createOperatorUpload(
  input: OperatorUploadCreateRequestDto,
  headers: { 'Idempotency-Key'?: string },
): Promise<{ data: UploadSessionResponseDto; etag: string }> {
  await delay(350);
  const key = requireKey(headers['Idempotency-Key']);
  requireOperatorPurpose(input.purpose);

  if (!input.fileName.trim()) {
    throwMockApiError('validation_error', {
      message: 'Thiếu tên tệp cần tải lên.',
      details: [{ field: 'fileName', message: 'Tên tệp không được để trống.' }],
    });
  }
  if (!isValidChecksumSha256(input.checksumSha256)) {
    throwMockApiError('upload_validation_failed', {
      message: 'Checksum SHA-256 không hợp lệ.',
      details: [{ field: 'checksumSha256', message: 'Cần 64 ký tự hex thường.' }],
    });
  }
  if (!input.sizeBytes || input.sizeBytes < 1) {
    throwMockApiError('upload_validation_failed', {
      message: 'Kích thước tệp không hợp lệ.',
      details: [{ field: 'sizeBytes', message: 'Kích thước phải lớn hơn 0.' }],
    });
  }

  const payload = JSON.stringify({ purpose: input.purpose, fileName: input.fileName });
  return replayGuard(
    key,
    payload,
    () => {
      const uploadId = `up-${fakeSha256(`upload:${key}`).slice(0, 32)}`;
      const state: MockUploadState = {
        session: {
          id: uploadId,
          fileId: `file-${fakeSha256(`file:${key}`).slice(0, 32)}`,
          status: 'uploading',
          partSizeBytes: PART_SIZE_BYTES,
          expiresAt: '2026-09-28T22:00:00Z',
          version: null,
        },
        versionStep: 0,
        checksumSha256: input.checksumSha256,
        purpose: input.purpose,
        partCount: Math.max(1, Math.ceil((input.sizeBytes ?? 1) / PART_SIZE_BYTES)),
      };
      OPERATOR_UPLOAD_STATE.set(uploadId, state);
      return { data: sessionOf(state), etag: uploadETag(state) };
    },
    (response) => response,
  );
}

/** API-234 — đọc trạng thái phiên tải lên. */
export async function getOperatorUpload(
  uploadId: string,
): Promise<{ data: UploadSessionResponseDto; etag: string }> {
  await delay(200);
  if (!uploadId.trim()) {
    throwMockApiError('validation_error', { message: 'Thiếu uploadId.' });
  }
  const state = findSession(uploadId);
  return { data: sessionOf(state), etag: uploadETag(state) };
}

/** API-236 — xin URL cho các part. */
export async function requestOperatorPartUrls(
  uploadId: string,
  partNumbers: number[],
  headers: { 'Idempotency-Key'?: string },
): Promise<{ data: UploadPartUrlsResponseDto }> {
  await delay(250);
  const key = requireKey(headers['Idempotency-Key']);
  const state = findSession(uploadId);
  if (partNumbers.length === 0) {
    throwMockApiError('validation_error', {
      message: 'Cần chọn ít nhất một phần để tải lên.',
      details: [{ field: 'partNumbers', message: 'Danh sách part rỗng.' }],
    });
  }

  return replayGuard(
    key,
    JSON.stringify({ uploadId, partNumbers }),
    () => ({
      data: {
        parts: partNumbers.map((partNumber) => ({
          partNumber,
          url: `https://upload.mock.hoanghai.vn/${uploadId}/part-${partNumber}`,
          expiresAt: '2026-09-27T22:15:00Z',
        })),
      },
    }),
    (response) => response,
  );
}

/**
 * PUT bytes lên presigned URL. Mock URL không nhận bytes thật nên chỉ xác nhận
 * phần đã đọc thành công từ đĩa — KHÔNG gắn bearer RoadGuard.
 */
async function putMockParts(
  state: MockUploadState,
  parts: { partNumber: number; bytes: Uint8Array }[],
  onProgress?: (percent: number) => void,
): Promise<CompletedUploadPartDto[]> {
  const completed: CompletedUploadPartDto[] = [];
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    await delay(120);
    completed.push({
      partNumber: part.partNumber,
      eTag: `"part-${part.partNumber}-${fakeSha256(
        `${state.session.id}:${part.partNumber}:${part.bytes.length}`,
      ).slice(0, 16)}"`,
    });
    const percent = Math.round(((index + 1) / Math.max(1, state.partCount)) * 100);
    onProgress?.(Math.min(100, percent));
  }
  return completed;
}

/** API-235 — hoàn tất tải lên (202, chờ xác minh). */
export async function completeOperatorUpload(
  uploadId: string,
  body: UploadCompleteRequestDto,
  headers: { 'Idempotency-Key'?: string; 'If-Match'?: string },
): Promise<{ data: UploadSessionResponseDto; etag: string }> {
  await delay(300);
  const key = requireKey(headers['Idempotency-Key']);
  const state = findSession(uploadId);
  assertUploadIfMatch(state, headers['If-Match']);
  if (body.parts.length === 0) {
    throwMockApiError('validation_error', {
      message: 'Thiếu danh sách phần đã tải lên.',
      details: [{ field: 'parts', message: 'Cần ít nhất một phần.' }],
    });
  }
  if (!isValidChecksumSha256(body.checksumSha256)) {
    throwMockApiError('upload_validation_failed', {
      message: 'Checksum SHA-256 không hợp lệ.',
    });
  }
  if (body.checksumSha256 !== state.checksumSha256) {
    throwMockApiError('upload_validation_failed', {
      message: 'Checksum không khớp với phiên tải lên đã khai báo.',
    });
  }

  return replayGuard(
    key,
    JSON.stringify({ uploadId, checksum: body.checksumSha256, parts: body.parts.length }),
    () => {
      state.session.status = 'verifying';
      state.versionStep += 1;
      return { data: sessionOf(state), etag: uploadETag(state) };
    },
    (response) => response,
  );
}

export interface OperatorFileUploadInput {
  uri: string;
  fileName: string;
  mediaType: string;
  purpose: OperatorUploadPurpose;
  projectId?: string | null;
  targetId?: string | null;
  /** Khoá gốc của lệnh; hàm tự sinh khoá con cho từng API để phát lại an toàn. */
  commandKey: string;
}

/**
 * Chạy trọn luồng 233 → 236 → PUT → 235 cho một tệp và trả `fileId` để nộp dataset.
 * Ném lỗi mock (ProblemDetails) khi bất kỳ bước nào thất bại.
 */
export async function uploadOperatorFile(
  input: OperatorFileUploadInput,
  onProgress?: (percent: number) => void,
): Promise<OperatorUploadResult> {
  const file = new File(input.uri);
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.length === 0) {
    throwMockApiError('upload_validation_failed', {
      message: 'Tệp rỗng, không thể tải lên.',
    });
  }
  const checksum = await sha256HexOfBytes(bytes);

  const session = await createOperatorUpload(
    {
      purpose: input.purpose,
      projectId: input.projectId ?? null,
      targetId: input.targetId ?? null,
      fileName: input.fileName,
      mediaType: input.mediaType,
      sizeBytes: bytes.length,
      checksumSha256: checksum,
    },
    { 'Idempotency-Key': `${input.commandKey}:create` },
  );

  const partNumbers: number[] = [];
  const partSize = session.data.partSizeBytes || PART_SIZE_BYTES;
  for (let offset = 0, partNumber = 1; offset < bytes.length; offset += partSize, partNumber += 1) {
    partNumbers.push(partNumber);
  }

  await requestOperatorPartUrls(session.data.id, partNumbers, {
    'Idempotency-Key': `${input.commandKey}:part-urls`,
  });

  const partsToPut = partNumbers.map((partNumber, index) => {
    const start = index * partSize;
    return { partNumber, bytes: bytes.slice(start, Math.min(start + partSize, bytes.length)) };
  });
  const completed = await putMockParts(
    OPERATOR_UPLOAD_STATE.get(session.data.id) as MockUploadState,
    partsToPut,
    onProgress,
  );

  const completedSession = await completeOperatorUpload(
    session.data.id,
    { parts: completed, checksumSha256: checksum },
    { 'Idempotency-Key': `${input.commandKey}:complete`, 'If-Match': session.etag },
  );

  return {
    uploadId: completedSession.data.id,
    fileId: completedSession.data.fileId,
    status: completedSession.data.status,
    checksumSha256: checksum,
    sizeBytes: bytes.length,
    parts: completed.length,
  };
}

/** Xoá trạng thái mock (dùng khi rời màn hình để tránh giữ bytes). */
export function clearOperatorUploadMock(): void {
  OPERATOR_UPLOAD_STATE.clear();
  OPERATOR_UPLOAD_IDEMPOTENCY.clear();
}
