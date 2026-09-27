// PROPOSED local-only models. Never serialize these objects directly to API.
import type { Error as ApiError, SyncOperation } from './api.types';
export type LocalState = 'DRAFT' | 'WAITING_DEPENDENCIES' | 'READY' | 'IN_FLIGHT'
  | 'UNKNOWN_OUTCOME' | 'AUTH_REQUIRED' | 'PAUSED_RETRY' | 'CONFLICT'
  | 'REJECTED' | 'BLOCKED_CONTRACT' | 'ACKED';
export interface PartitionKey {
  environmentId: string; apiOrigin: string; actorId: string; localSchemaVersion: number;
}
export interface LocalIntent {
  localIntentId: string;
  partition: PartitionKey;
  kind: 'INSPECTION_SUBMIT' | 'REPAIR_START' | 'REPAIR_SUBMIT' | 'SURVEY_DATASET' | 'REWORK_START';
  localDraftId: string;
  baseSnapshotId: string;
  dependsOnIntentIds: string[];
  mediaIds: string[];
  state: LocalState;
  createdAt: string;
  // Payload is materialized after dependencies and schema validation; no untyped wire blob.
}
export interface SyncWireCommand {
  localIntentId: string;
  operation: SyncOperation;
  serializedOperation: string; // Exact stable replay bytes after first send.
  payloadSha256: string;
  serializerVersion: string;
  firstSentAt: string | null;
  state: LocalState;
  lastError: ApiError | null;
}
export interface BatchEnvelopeLedger {
  idempotencyKey: string;
  operationIds: string[];
  serializedBody: string;
  payloadSha256: string;
  nextRetryAt: string | null;
  attemptCount: number;
}
export interface LocalMedia {
  localMediaId: string;
  partition: PartitionKey;
  privateRelativePath: string;
  checksumSha256: string;
  sizeBytes: number;
  purpose: 'BEFORE' | 'AFTER' | 'MEASUREMENT' | 'SURVEY_VIDEO' | 'TELEMETRY';
  sourceKind: 'CREW_CAPTURE' | 'REPORT_PHOTO' | 'SURVEY_FRAME' | 'FIELD_MEASUREMENT' | 'OPERATOR_FILE';
  capturedAt: string | null;
  uploadId: string | null;
  serverFileId: string | null;
  state: 'LOCAL_SAVING' | 'LOCAL_READY' | 'SESSION_CREATED' | 'UPLOADING'
    | 'COMPLETE_REQUESTED' | 'VERIFYING' | 'VERIFIED' | 'PAUSED' | 'FAILED';
}
export interface IdMapping {
  localId: string; resourceType: string; serverId: string; serverVersion: string;
}
export type UiResult<T> =
  | { kind: 'server-confirmed'; data: T }
  | { kind: 'local-saved'; localIntentId: string; state: LocalState }
  | { kind: 'api-error'; status: number; error: ApiError }
  | { kind: 'transport-error'; reason: 'offline' | 'timeout' | 'network'; unknownOutcome: boolean }
  | { kind: 'contract-error'; diagnosticId: string }
  | { kind: 'local-error'; code: 'CLIENT_STORAGE_FULL' | 'CLIENT_WRITE_FAILED' | 'CLIENT_MEDIA_UNREADABLE' }
  | { kind: 'cancelled'; unknownOutcome: boolean };
