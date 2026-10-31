import { reportDescriptionError } from '../api/reporterValidation';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { appStorage } from './storage';
import type { CreateReporterReportRequestDto } from '../api/mock/reporter';
import { openDatabase, initDatabase, saveDraft, getDraft } from '../offline/database';
import { File } from 'expo-file-system';
import { useAuthStore } from './auth';
import { useUploadsStore, reporterContext, assertReporterContext } from './uploads';
import { isReporterSession, MAX_PHOTO_BYTES, sha256HexOfBytes, strongUploadETag, uploadFailureMessage, UPLOAD_FAILURE_STAGES, type UploadFailureStage } from '../api/uploads';
import { reporterPhotoFailureMessage } from '../api/reporterLocalMedia';
import { submitReportReal, submitReportSupplementReal, getOwnReportReal } from '../api/reporterApi';
import { uuidv4 } from '../utils/uuid';
import { useEffect, useRef } from 'react';
import { buildReportEvidenceLocation, locationSourceFor as sourceFor } from '../types/position';

export interface DraftPhoto {
  uri: string;
  fileName: string;
  mediaType: string;
  capturedAt: string;
  itemId?: string;
  /** Admission proof for NEW durable selections; never backfilled onto historical media. */
  sizeBytes?: number;
  checksumSha256?: string;
}

export interface ReporterDraft {
  id: string;
  ownerId: string | null;
  provenance: { environment: string; session: string | null };
  commandKey: string;
  description: string;
  photos: DraftPhoto[];
  coords: { latitude: number; longitude: number; accuracyMeters: number | null } | null;
  targetReportId?: string;
  ifMatch?: string;
  request?: CreateReporterReportRequestDto;
  resultReportId?: string;
  commandOutcome?: 'PREPARED' | 'UNKNOWN_OUTCOME' | 'REJECTED';
  rejection?: { status: 412; code: 'concurrency_conflict' };
  retired?: boolean;
  submitRequested: boolean;
}

type DraftInput = Pick<ReporterDraft, 'description' | 'photos' | 'coords'> &
  Pick<Partial<ReporterDraft>, 'targetReportId' | 'ifMatch' | 'submitRequested'>;

type ReporterContext = ReturnType<typeof reporterContext>;
const draftKey = (context: ReporterContext) => `reporter-pending-v3:${context.partition}`;
export function isStartedReporterCommand(draft: ReporterDraft): boolean {
  return Boolean(draft.submitRequested || draft.request || draft.resultReportId || draft.commandOutcome || draft.photos.some(photo => photo.itemId));
}
const provenanceMatches = (draft: ReporterDraft, context: ReporterContext) => draft.ownerId === context.ownerId &&
  draft.provenance?.environment === context.environment && draft.provenance?.session === context.session;
// Hold the native handle for the store lifetime. Serialize initialization and
// retry initialization failures on that handle; never delete/recreate the DB.
let draftDatabase: ReturnType<typeof openDatabase> | undefined;
let draftInitialization: Promise<ReturnType<typeof openDatabase>> | undefined;
async function draftDb() {
  const db = draftDatabase ?? (draftDatabase = openDatabase());
  if (!draftInitialization) {
    draftInitialization = initDatabase(db).then(() => db).catch(error => {
      draftInitialization = undefined;
      throw error;
    });
  }
  return draftInitialization;
}
async function persistDraft(draft: ReporterDraft, context: ReporterContext) {
  const db = await draftDb();
  assertReporterContext(context);
  await saveDraft(db, draftKey(context), 'reporter_pending_v1', draft as unknown as Record<string, unknown>);
}
let submission: Promise<string> | null = null;
let submissionOwner: string | null = null;
let draftMutation: Promise<unknown> = Promise.resolve();
function serializeDraft<T>(action: () => Promise<T>): Promise<T> {
  const next = draftMutation.catch(() => undefined).then(action);
  draftMutation = next;
  return next;
}
function hasDraftContent(draft: ReporterDraft | null): draft is ReporterDraft {
  return Boolean(draft && !draft.retired && (draft.description.trim() || draft.photos.length || draft.request || draft.resultReportId || draft.submitRequested));
}
async function readPending(context: ReporterContext): Promise<ReporterDraft | null> {
  let phase = 'storage_open';
  try {
  const db = await draftDb();
  phase = 'draft_read';
  assertReporterContext(context);
  const draft = await getDraft<ReporterDraft>(db, draftKey(context)) ?? await getDraft<ReporterDraft>(db, `reporter-pending-v2:${context.partition}`);
  assertReporterContext(context);
  if (hasDraftContent(draft)) return provenanceMatches(draft, context) ? draft : null;
  // Same device/environment is not ownership proof. No guest claim contract exists;
  // never read or rewrite guest/legacy rows on behalf of an authenticated account.
  return null;
  } catch (error) {
    // Only bounded diagnostic categories. Never log native messages, paths or payloads.
    const message = error instanceof Error ? error.message : '';
    const category = /locked|busy/i.test(message) ? 'storage_busy'
      : /prepareAsync|NullPointerException/i.test(message) ? 'native_statement'
      : /syntax|no such|column/i.test(message) ? 'storage_structure'
      : error instanceof SyntaxError ? 'draft_format' : 'storage_read_failed';
    console.warn(`[Reporter restore] ${phase}/${category}`);
    throw error;
  }
}

export const GUEST_DRAFT_NOTICE = 'Nháp khách được giữ riêng trên thiết bị, không tự chuyển vào tài khoản khi đăng nhập hoặc xác thực OTP. Chưa có cơ chế xác minh chủ sở hữu để gửi nháp đó.';

/** Bind screen callbacks to the render that initiated them, including delayed autosaves.
 * Token refresh may invalidate UI work conservatively; it never moves pending data. */
export function useReporterDraftScope() {
  useAuthStore(state => state);
  const context = reporterContext();
  const mounted = useRef(true);
  const generation = useRef(0);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++; }; }, []);
  return {
    key: JSON.stringify(context),
    invalidate: () => { generation.current++; },
    capture: () => {
      const capturedGeneration = generation.current;
      return () => {
        if (!mounted.current || capturedGeneration !== generation.current) return false;
        try { assertReporterContext(context); return true; } catch { return false; }
      };
    },
  };
}

/** Safe Vietnamese messages; transport/server bodies may contain private implementation details. */
export function reporterFailureMessage(error: unknown): string {
  const e = error as { code?: string; stage?: string; status?: number; response?: { status?: number; data?: { code?: string } } };
  const status = e.response?.status ?? e.status;
  const code = e.response?.data?.code ?? e.code;
  if (status === 401 || code === 'auth_unauthorized') return 'Vui lòng đăng nhập lại. Nháp và ảnh vẫn được giữ.';
  if (status === 403 || code === 'access_forbidden') return 'Tài khoản không có quyền gửi nháp này.';
  if (status === 412 || code === 'concurrency_conflict') return 'Phiên bản đã thay đổi. Nháp được giữ nguyên; cần kiểm tra trước khi gửi lại.';
  if (status === 428) return 'Thiếu điều kiện gửi. Nháp được giữ nguyên.';
  const admission = reporterPhotoFailureMessage(error);
  if (admission) return admission;
  if (UPLOAD_FAILURE_STAGES.includes(e.stage as UploadFailureStage)) return uploadFailureMessage(code ?? null, status, e.stage as UploadFailureStage);
  if (e.stage === 'readback') return 'Chưa đối soát được kết quả đã gửi. Nháp, ảnh và khóa lệnh vẫn được giữ; chưa xác nhận hoàn tất.';
  if (code === 'local_photo_read_failed') return 'Không đọc được ảnh cục bộ. Chưa xác định nguyên nhân; nháp và ảnh vẫn được giữ.';
  if ((e.stage === 'submitReport' || e.stage === 'submitSupplement') && code === 'source_not_ready')
    return 'Chưa xác nhận kết quả gửi. Nháp và khóa lệnh được giữ nguyên để đối soát.';
  if (code === 'source_not_ready') return 'Ảnh đang chờ xác minh. Chưa gửi phản ánh; bấm gửi lại để kiểm tra.';
  if (code === 'local_photo_missing') return 'Không đọc được ảnh cục bộ. Nháp vẫn còn; vui lòng chọn lại ảnh.';
  if (code === 'draft_locked') return 'Lần gửi trước chưa được xác nhận. Giữ nguyên nội dung và bấm gửi lại để kiểm tra.';
  if (status === 400 || status === 422) return 'Thông tin hoặc điều kiện gửi chưa hợp lệ. Nháp được giữ nguyên.';
  if (status === 409) return 'Yêu cầu xung đột với dữ liệu máy chủ. Nháp và khóa lệnh được giữ nguyên.';
  if (status === 503) return 'Dịch vụ tạm thời không sẵn sàng. Chưa xác nhận kết quả; vui lòng thử lại.';
  return 'Chưa xác nhận kết quả gửi. Nháp được giữ nguyên; bấm gửi lại để kiểm tra với cùng khóa lệnh.';
}

interface ReporterSessionState {
  email: string | null;
  verifiedEmail: string | null;
  pendingReport: CreateReporterReportRequestDto | null;
  /** Id bản nháp đang chờ đăng nhập — dùng làm scope Idempotency-Key ổn định. */
  pendingDraftId: string | null;
  pendingDraft: ReporterDraft | null;
  restorePendingDraft: () => Promise<ReporterDraft | null>;
  restoreStartedCommand: () => Promise<ReporterDraft | null>;
  savePendingDraft: (input: DraftInput) => Promise<ReporterDraft>;
  bindPendingDraft: () => Promise<ReporterDraft | null>;
  submitPendingDraft: () => Promise<string>;
  renewSupplementDraft: () => Promise<ReporterDraft>;
  setEmail: (email: string) => void;
  markVerified: (email: string) => void;
  setPendingReport: (report: CreateReporterReportRequestDto | null, draftId?: string) => void;
  clearPendingReport: () => void;
  clearSession: () => void;
}

export const useReporterStore = create<ReporterSessionState>()(
  persist(
    (set, get) => ({
      email: null,
      verifiedEmail: null,
      pendingReport: null,
      pendingDraftId: null,
      pendingDraft: null,
      restorePendingDraft: () => {
        const context = reporterContext();
        return serializeDraft(async () => {
        const draft = await readPending(context);
        assertReporterContext(context);
        set({ pendingDraft: draft, pendingDraftId: draft?.id ?? null });
        return draft;
        });
      },
      restoreStartedCommand: async () => {
        const draft = await get().restorePendingDraft();
        if (draft && !isStartedReporterCommand(draft)) {
          set({ pendingDraft: null, pendingDraftId: null });
          return null;
        }
        return draft;
      },
      savePendingDraft: (input) => {
        const context = reporterContext();
        return serializeDraft(async () => {
        assertReporterContext(context);
        const ownerId = context.ownerId;
        const current = get().pendingDraft;
        let previous = hasDraftContent(current) && provenanceMatches(current, context) ? current : await readPending(context);
        assertReporterContext(context);
        if (submission) throw { code: 'draft_locked' };
        if (previous?.ownerId && previous.ownerId !== ownerId) throw { code: 'access_forbidden', status: 403 };
        if (input.submitRequested && reportDescriptionError(input.description)) throw { code: 'validation_error', status: 400 };
        // Preserve legacy unsent rows byte-for-byte before using the active pointer.
        if (input.submitRequested && previous && !isStartedReporterCommand(previous)) {
          const db = await draftDb();
          assertReporterContext(context);
          await saveDraft(db, `reporter-unstarted-history-v1:${context.partition}:${previous.id}`, 'reporter_pending_v1', previous as unknown as Record<string, unknown>);
          assertReporterContext(context);
          previous = null;
        }
        if (previous?.request || (previous && isStartedReporterCommand(previous))) {
          const same = previous.targetReportId === input.targetReportId &&
            JSON.stringify(previous.coords) === JSON.stringify(input.coords) && previous.description === input.description &&
            previous.photos.map(p => p.uri).join('\n') === input.photos.map(p => p.uri).join('\n');
          if (!same) throw { code: 'draft_locked' };
          return previous;
        }
        if (previous && previous.targetReportId !== input.targetReportId) throw { code: 'draft_locked' };
        const draft: ReporterDraft = {
          id: previous?.id ?? uuidv4(), commandKey: previous?.commandKey ?? uuidv4(), ownerId: previous?.ownerId ?? ownerId,
          provenance: { environment: context.environment, session: context.session },
          description: input.description, photos: input.photos.map(photo => ({ ...photo,
            itemId: previous?.photos.find(p => p.uri === photo.uri)?.itemId ?? photo.itemId })),
          coords: input.coords, targetReportId: input.targetReportId, ifMatch: input.ifMatch ?? previous?.ifMatch,
          submitRequested: input.submitRequested ?? previous?.submitRequested ?? false,
        };
        await persistDraft(draft, context);
        assertReporterContext(context);
        set({ pendingDraft: draft, pendingDraftId: draft.id });
        return draft;
        });
      },
      bindPendingDraft: () => {
        const context = reporterContext();
        return serializeDraft(async () => {
        assertReporterContext(context);
        if (!context.ownerId) throw { code: 'auth_unauthorized', status: 401 };
        const draft = await readPending(context);
        if (!draft) return null;
        assertReporterContext(context);
        // Compatibility entry point: restore an already-owned draft, never assign ownership.
        set({ pendingDraft: draft, pendingDraftId: draft.id });
        return draft;
        });
      },
      renewSupplementDraft: () => {
        const context = reporterContext();
        return serializeDraft(async () => {
          assertReporterContext(context);
          if (!context.ownerId || submission) throw { code: 'draft_locked' };
          const old = await readPending(context);
          assertReporterContext(context);
          if (!old?.targetReportId || !old.request || old.resultReportId || old.commandOutcome !== 'REJECTED' ||
              old.rejection?.status !== 412 || old.rejection.code !== 'concurrency_conflict') throw { code: 'draft_locked' };
          const found = await getOwnReportReal(old.targetReportId);
          assertReporterContext(context);
          // Conservative append-only readback: any matching evidence may belong to
          // this command. Do not mint a second command when that lineage is ambiguous.
          if (found.report.id !== old.targetReportId || !found.etag || !Array.isArray(found.report.evidence) ||
              !old.request.evidence?.length || old.request.evidence.some(expected =>
                found.report.evidence.some(actual => actual.fileId === expected.fileId && actual.fileVersion === expected.fileVersion)))
            throw { code: 'draft_locked' };
          const version = strongUploadETag(found.etag);
          if (version === strongUploadETag(old.ifMatch ?? '')) throw { code: 'draft_locked' };
          const db = await draftDb();
          assertReporterContext(context);
          await saveDraft(db, `reporter-history-v1:${context.partition}:${old.id}`, 'reporter_pending_v1',
            { ...old, retired: true } as unknown as Record<string, unknown>);
          assertReporterContext(context);
          const next: ReporterDraft = { id: uuidv4(), commandKey: uuidv4(), ownerId: old.ownerId,
            provenance: { ...old.provenance }, description: old.description, photos: old.photos.map(p => ({ ...p })),
            coords: old.coords, targetReportId: old.targetReportId, ifMatch: version, submitRequested: true };
          await persistDraft(next, context);
          assertReporterContext(context);
          set({ pendingDraft: next, pendingDraftId: next.id });
          return next;
        });
      },
      submitPendingDraft: () => {
        const context = reporterContext();
        const caller = context.ownerId;
        if (!caller) return Promise.reject({ code: 'auth_unauthorized', status: 401 });
        if (submission) return submissionOwner === JSON.stringify(context) ? submission : Promise.reject({ status: 401 });
        submissionOwner = JSON.stringify(context);
        submission = (async () => {
          const auth = useAuthStore.getState();
          if (!isReporterSession(auth)) throw { code: 'auth_unauthorized', status: 401 };
          let draft = await get().bindPendingDraft();
          if (!draft || draft.photos.length === 0) throw { code: 'validation_error', status: 400 };
          if (reportDescriptionError(draft.request?.description ?? draft.description)) throw { code: 'validation_error', status: 400 };
          if (draft.commandOutcome === 'REJECTED') throw { status: 412, code: 'concurrency_conflict' };
          const assertOwner = () => assertReporterContext(context);
          assertOwner();
          const putDraft = async (next: ReporterDraft) => {
            assertOwner(); await persistDraft(next, context); assertOwner(); draft = next;
            set({ pendingDraft: next, pendingDraftId: next.id });
          };
          const queue = useUploadsStore.getState();
          await queue.hydrate(context.partition);
          assertOwner();
          for (let index = 0; index < draft.photos.length && !draft.resultReportId; index++) {
            assertOwner();
            const photo = draft.photos[index];
            let id = photo.itemId;
            if (!id) {
              let bytes: Uint8Array;
              try {
                const file = new File(photo.uri);
                if (file.exists === false) throw { code: 'local_photo_missing', stage: 'local_read' };
                if (typeof file.size === 'number' && (file.size <= 0 || file.size > MAX_PHOTO_BYTES)) throw { code: 'validation_error', status: 400, stage: 'local_read' };
                bytes = new Uint8Array(await file.arrayBuffer());
              } catch (error) {
                assertOwner();
                if ((error as { stage?: string })?.stage === 'local_read') throw error;
                throw { code: 'local_photo_read_failed', stage: 'local_read' };
              }
              assertOwner();
              if (!bytes.length || bytes.length > MAX_PHOTO_BYTES) throw { code: 'validation_error', status: 400 };
              const checksumSha256 = await sha256HexOfBytes(bytes);
              assertOwner();
              if ((photo.checksumSha256 && photo.checksumSha256 !== checksumSha256) ||
                  (photo.sizeBytes !== undefined && photo.sizeBytes !== bytes.length)) throw { code: 'upload_bytes_changed', stage: 'local_read' };
              const location = buildReportEvidenceLocation(draft.coords?.latitude, draft.coords?.longitude, draft.coords?.accuracyMeters);
              id = await queue.enqueuePhoto({ partitionId: context.partition, uriLocal: photo.uri, fileName: photo.fileName, mediaType: photo.mediaType,
                sizeBytes: bytes.length, checksumSha256, capturedAt: photo.capturedAt,
                locationSource: sourceFor(Boolean(location)), ...location });
              await putDraft({ ...draft, photos: draft.photos.map((p, i) => i === index ? { ...p, itemId: id } : p) });
            }
            const linked = useUploadsStore.getState().items.find(p => p.id === id);
            if (!linked || linked.partitionId !== context.partition || linked.uriLocal !== photo.uri ||
                linked.fileName !== photo.fileName || linked.mediaType !== photo.mediaType) throw { code: 'access_forbidden', status: 403 };
            await queue.advanceItem(id);
            assertOwner();
            const item = useUploadsStore.getState().items.find(p => p.id === id);
            if (!item || item.mediaState !== 'VERIFIED' || !item.fileId || !item.verifiedVersion || item.lastErrorCode) {
              if (item?.lastErrorCode) throw { code: item.lastErrorCode, stage: item.lastErrorStage, status: item.lastErrorStatus };
              throw { code: 'source_not_ready' };
            }
          }
          if (!draft.request) {
            const evidence = draft.photos.map(photo => {
              const item = useUploadsStore.getState().items.find(p => p.id === photo.itemId)!;
              const location = buildReportEvidenceLocation(item.latitude, item.longitude, item.accuracyMeters);
              return { fileId: item.fileId!, fileVersion: item.verifiedVersion!, capturedAt: item.capturedAt,
                locationSource: location ? item.locationSource : 'UNKNOWN' as const, ...(location ? { location } : {}) };
            });
            await putDraft({ ...draft, request: { description: draft.description, evidence },
              ...(draft.targetReportId ? { commandOutcome: 'PREPARED' as const } : {}) });
          }
          assertOwner();
          if (!draft.resultReportId) {
            const firstDispatch = draft.commandOutcome === 'PREPARED';
            if (draft.targetReportId) await putDraft({ ...draft, commandOutcome: 'UNKNOWN_OUTCOME' });
            let result;
            try {
              result = draft.targetReportId
                ? await submitReportSupplementReal(draft.targetReportId, draft.request!, draft.commandKey, strongUploadETag(draft.ifMatch ?? ''))
                : await submitReportReal(draft.request!, draft.commandKey);
            } catch (error) {
              assertOwner();
              const e = error as { status?: number; code?: string; response?: { status?: number; data?: { code?: string } } };
              // Only an observed first-dispatch, declared precondition rejection
              // proves no earlier unknown attempt exists. Legacy/timeout replay stays unknown.
              if (draft.targetReportId && firstDispatch && (e.response?.status ?? e.status) === 412 &&
                  (e.response?.data?.code ?? e.code) === 'concurrency_conflict')
                await putDraft({ ...draft, commandOutcome: 'REJECTED', rejection: { status: 412, code: 'concurrency_conflict' } });
              throw { ...(error as object), stage: draft.targetReportId ? 'submitSupplement' : 'submitReport' };
            }
            if (draft.targetReportId && result.report.id !== draft.targetReportId) {
              // A response for another report cannot acknowledge this supplement.
              // Retain the original request/key as unknown for exact reconciliation.
              throw { code: 'source_not_ready', stage: 'submitSupplement' };
            }
            await putDraft({ ...draft, resultReportId: result.report.id });
          }
          assertOwner();
          let found;
          try { found = await getOwnReportReal(draft.resultReportId!); }
          catch (error) { assertOwner(); throw { ...(error as object), stage: 'readback' }; }
          assertOwner();
          if ((draft.targetReportId && draft.resultReportId !== draft.targetReportId) ||
            found.report.id !== draft.resultReportId || !draft.request!.evidence?.every(expected =>
            found.report.evidence.some(actual => actual.fileId === expected.fileId && actual.fileVersion === expected.fileVersion))) {
            throw { code: 'source_not_ready', stage: 'readback' };
          }
          const reportId = found.report.id;
          const db = await draftDb();
          assertOwner();
          // Keep the receipt, command, evidence and original key for reconciliation.
          // Archive before retiring the active pointer; a failed write remains retryable.
          const retired = { ...draft, retired: true };
          await saveDraft(db, `reporter-history-v1:${context.partition}:${draft.id}`, 'reporter_pending_v1', retired as unknown as Record<string, unknown>);
          assertOwner();
          await persistDraft(retired, context);
          assertOwner();
          set({ pendingDraft: null, pendingDraftId: null, pendingReport: null });
          return reportId;
        })().finally(() => { submission = null; submissionOwner = null; });
        return submission;
      },
      setEmail: (email) => set({ email }),
      markVerified: (email) => set({ email, verifiedEmail: email }),
      setPendingReport: (report, draftId) =>
        set({ pendingReport: report, pendingDraftId: report ? draftId ?? null : null }),
      clearPendingReport: () => set({ pendingReport: null, pendingDraftId: null }),
      clearSession: () =>
        set({ email: null, verifiedEmail: null, pendingReport: null, pendingDraftId: null, pendingDraft: null }),
    }),
    {
      name: 'reporter-session',
      storage: appStorage,
      partialize: (state) => ({
        email: state.email,
        verifiedEmail: state.verifiedEmail,
      }),
    },
  ),
);

useAuthStore.subscribe?.((state, previous) => {
  if (state.user?.id !== previous.user?.id || state.token !== previous.token || !isReporterSession(state)) {
    useReporterStore.setState({ pendingDraft: null, pendingDraftId: null, pendingReport: null });
  }
});
