import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { appStorage } from './storage';
import type { CreateReporterReportRequestDto } from '../api/mock/reporter';
import { openDatabase, initDatabase, saveDraft, getDraft, deleteDraft } from '../offline/database';
import { File } from 'expo-file-system';
import { useAuthStore } from './auth';
import { useUploadsStore } from './uploads';
import { isReporterSession, MAX_PHOTO_BYTES, sha256HexOfBytes, locationSourceFor, strongUploadETag } from '../api/uploads';
import { submitReportReal, submitReportSupplementReal, getOwnReportReal } from '../api/reporterApi';
import { uuidv4 } from '../utils/uuid';

export interface DraftPhoto {
  uri: string;
  fileName: string;
  mediaType: string;
  capturedAt: string;
  itemId?: string;
}

export interface ReporterDraft {
  id: string;
  ownerId: string | null;
  commandKey: string;
  description: string;
  photos: DraftPhoto[];
  coords: { latitude: number; longitude: number; accuracyMeters: number | null } | null;
  targetReportId?: string;
  ifMatch?: string;
  request?: CreateReporterReportRequestDto;
  resultReportId?: string;
  submitRequested: boolean;
}

type DraftInput = Pick<ReporterDraft, 'description' | 'photos' | 'coords'> &
  Pick<Partial<ReporterDraft>, 'targetReportId' | 'ifMatch' | 'submitRequested'>;

const draftKey = (ownerId: string | null) => `reporter-pending:${ownerId ?? 'guest'}`;
async function draftDb() {
  const db = openDatabase();
  await initDatabase(db);
  return db;
}
async function persistDraft(draft: ReporterDraft) {
  await saveDraft(await draftDb(), draftKey(draft.ownerId), 'reporter_pending_v1', draft as unknown as Record<string, unknown>);
}
let submission: Promise<string> | null = null;
let submissionOwner: string | null = null;
let draftMutation: Promise<unknown> = Promise.resolve();
function serializeDraft<T>(action: () => Promise<T>): Promise<T> {
  const next = draftMutation.catch(() => undefined).then(action);
  draftMutation = next;
  return next;
}
function ownerNow(): string | null {
  const auth = useAuthStore.getState();
  return isReporterSession(auth) ? auth.user!.id : null;
}
function assertDraftOwner(owner: string | null) {
  if (ownerNow() !== owner) throw { code: 'auth_unauthorized', status: 401 };
}
function hasDraftContent(draft: ReporterDraft | null): draft is ReporterDraft {
  return Boolean(draft && (draft.description.trim() || draft.photos.length || draft.request || draft.resultReportId || draft.submitRequested));
}
async function readPending(owner: string | null): Promise<ReporterDraft | null> {
  const db = await draftDb();
  let draft = owner ? await getDraft<ReporterDraft>(db, draftKey(owner)) : null;
  if (!hasDraftContent(draft)) draft = await getDraft<ReporterDraft>(db, draftKey(null));
  assertDraftOwner(owner);
  return !hasDraftContent(draft) || (draft.ownerId && draft.ownerId !== owner) ? null : draft;
}

/** Safe Vietnamese messages; transport/server bodies may contain private implementation details. */
export function reporterFailureMessage(error: unknown): string {
  const e = error as { code?: string; status?: number; response?: { status?: number; data?: { code?: string } } };
  const status = e.response?.status ?? e.status;
  const code = e.response?.data?.code ?? e.code;
  if (status === 401 || code === 'auth_unauthorized') return 'Vui lòng đăng nhập lại. Nháp và ảnh vẫn được giữ.';
  if (status === 403 || code === 'access_forbidden') return 'Tài khoản không có quyền gửi nháp này.';
  if (status === 412 || code === 'concurrency_conflict') return 'Phiên bản đã thay đổi. Nháp được giữ nguyên; cần kiểm tra trước khi gửi lại.';
  if (status === 428) return 'Thiếu điều kiện gửi. Nháp được giữ nguyên.';
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
  savePendingDraft: (input: DraftInput) => Promise<ReporterDraft>;
  bindPendingDraft: () => Promise<ReporterDraft | null>;
  submitPendingDraft: () => Promise<string>;
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
      restorePendingDraft: () => serializeDraft(async () => {
        const draft = await readPending(ownerNow());
        set({ pendingDraft: draft, pendingDraftId: draft?.id ?? null });
        return draft;
      }),
      savePendingDraft: (input) => {
        const savingOwner = ownerNow();
        return serializeDraft(async () => {
        assertDraftOwner(savingOwner);
        const auth = useAuthStore.getState();
        const ownerId = isReporterSession(auth) ? auth.user!.id : null;
        const current = get().pendingDraft;
        const previous = hasDraftContent(current) ? current : await readPending(ownerId);
        if (submission) throw { code: 'draft_locked' };
        if (previous?.ownerId && previous.ownerId !== ownerId) throw { code: 'access_forbidden', status: 403 };
        if (previous?.request) {
          const same = previous.targetReportId === input.targetReportId &&
            JSON.stringify(previous.coords) === JSON.stringify(input.coords) && previous.description === input.description &&
            previous.photos.map(p => p.uri).join('\n') === input.photos.map(p => p.uri).join('\n');
          if (!same) throw { code: 'draft_locked' };
          return previous;
        }
        if (previous && previous.targetReportId !== input.targetReportId) throw { code: 'draft_locked' };
        const draft: ReporterDraft = {
          id: previous?.id ?? uuidv4(), commandKey: previous?.commandKey ?? uuidv4(), ownerId: previous?.ownerId ?? ownerId,
          description: input.description, photos: input.photos.map(photo => ({ ...photo,
            itemId: previous?.photos.find(p => p.uri === photo.uri)?.itemId ?? photo.itemId })),
          coords: input.coords, targetReportId: input.targetReportId, ifMatch: input.ifMatch ?? previous?.ifMatch,
          submitRequested: input.submitRequested ?? previous?.submitRequested ?? false,
        };
        await persistDraft(draft);
        assertDraftOwner(ownerId);
        set({ pendingDraft: draft, pendingDraftId: draft.id });
        return draft;
        });
      },
      bindPendingDraft: () => serializeDraft(async () => {
        const auth = useAuthStore.getState();
        if (!isReporterSession(auth)) throw { code: 'auth_unauthorized', status: 401 };
        const draft = await readPending(auth.user!.id);
        if (!draft) return null;
        if (draft.ownerId && draft.ownerId !== auth.user!.id) throw { code: 'access_forbidden', status: 403 };
        assertDraftOwner(auth.user!.id);
        const bound = { ...draft, ownerId: auth.user!.id };
        if (!draft.ownerId) {
          // Claim guest row first. A crash cannot expose an adopted draft to another actor.
          await saveDraft(await draftDb(), draftKey(null), 'reporter_pending_v1', bound as unknown as Record<string, unknown>);
        }
        await persistDraft(bound);
        if (!draft.ownerId) await deleteDraft(await draftDb(), draftKey(null));
        assertDraftOwner(auth.user!.id);
        set({ pendingDraft: bound, pendingDraftId: bound.id });
        return bound;
      }),
      submitPendingDraft: () => {
        const caller = ownerNow();
        if (!caller) return Promise.reject({ code: 'auth_unauthorized', status: 401 });
        if (submission) return submissionOwner === caller ? submission : Promise.reject({ status: 401 });
        submissionOwner = caller;
        submission = (async () => {
          const auth = useAuthStore.getState();
          if (!isReporterSession(auth)) throw { code: 'auth_unauthorized', status: 401 };
          let draft = await get().bindPendingDraft();
          if (!draft || draft.photos.length === 0) throw { code: 'validation_error', status: 400 };
          const ownerId = auth.user!.id;
          const assertOwner = () => {
            const live = useAuthStore.getState();
            if (!isReporterSession(live) || live.user?.id !== ownerId) throw { code: 'auth_unauthorized', status: 401 };
          };
          const putDraft = async (next: ReporterDraft) => {
            assertOwner(); await persistDraft(next); assertOwner(); draft = next;
            set({ pendingDraft: next, pendingDraftId: next.id });
          };
          const queue = useUploadsStore.getState();
          await queue.hydrate(`reporter-${ownerId}`);
          for (let index = 0; index < draft.photos.length && !draft.resultReportId; index++) {
            assertOwner();
            const photo = draft.photos[index];
            let id = photo.itemId;
            if (!id) {
              let bytes: Uint8Array;
              try { bytes = new Uint8Array(await new File(photo.uri).arrayBuffer()); }
              catch { throw { code: 'local_photo_missing' }; }
              if (!bytes.length || bytes.length > MAX_PHOTO_BYTES) throw { code: 'validation_error', status: 400 };
              id = await queue.enqueuePhoto({ uriLocal: photo.uri, fileName: photo.fileName, mediaType: photo.mediaType,
                sizeBytes: bytes.length, checksumSha256: await sha256HexOfBytes(bytes), capturedAt: photo.capturedAt,
                locationSource: locationSourceFor(Boolean(draft.coords)), ...draft.coords });
              await putDraft({ ...draft, photos: draft.photos.map((p, i) => i === index ? { ...p, itemId: id } : p) });
            }
            await queue.advanceItem(id);
            assertOwner();
            const item = useUploadsStore.getState().items.find(p => p.id === id);
            if (!item || item.mediaState !== 'VERIFIED' || !item.fileId || !item.verifiedVersion || item.lastErrorCode) {
              if (item?.lastErrorCode) throw { code: item.lastErrorCode };
              throw { code: 'source_not_ready' };
            }
          }
          if (!draft.request) {
            const evidence = draft.photos.map(photo => {
              const item = useUploadsStore.getState().items.find(p => p.id === photo.itemId)!;
              return { fileId: item.fileId!, fileVersion: item.verifiedVersion!, capturedAt: item.capturedAt,
                locationSource: item.locationSource, location: draft!.coords };
            });
            await putDraft({ ...draft, request: { description: draft.description, evidence } });
          }
          assertOwner();
          if (!draft.resultReportId) {
            const result = draft.targetReportId
              ? await submitReportSupplementReal(draft.targetReportId, draft.request!, draft.commandKey, strongUploadETag(draft.ifMatch ?? ''))
              : await submitReportReal(draft.request!, draft.commandKey);
            await putDraft({ ...draft, resultReportId: result.report.id });
          }
          assertOwner();
          const found = await getOwnReportReal(draft.resultReportId!);
          assertOwner();
          if (found.report.id !== draft.resultReportId || !draft.request!.evidence?.every(expected =>
            found.report.evidence.some(actual => actual.fileId === expected.fileId && actual.fileVersion === expected.fileVersion))) {
            throw { code: 'source_not_ready' };
          }
          const reportId = found.report.id;
          await deleteDraft(await draftDb(), draftKey(ownerId));
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
  if (state.user?.id !== previous.user?.id || !isReporterSession(state)) {
    useReporterStore.setState({ pendingDraft: null, pendingDraftId: null, pendingReport: null });
  }
});
