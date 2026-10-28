import { useCallback, useEffect, useRef, useState } from 'react';
import { messageFor } from '../api/errorCatalog';
import { parseProblemDetails } from '../api/problemDetails';
import { uuidv4 } from '../utils/uuid';
import {
  getFieldInspectionTaskDetailReal,
  isCrewResourceId,
  normalRepairBlock,
  validateCrewTaskDetail,
} from '../api/crewApi';
import { currentRepairIdentity, sameRepairIdentity, type RepairIdentity } from '../api/crewRepairDraft';
import { useAuthStore } from '../store/auth';
import { passwordSessionIdentity } from '../api/authApi';
import type { CrewRepairContext, RepairAssessmentView, RepairAttemptIntakeView,
  RepairExecutionFinishView, RepairExecutionStartView } from '../api/crewApi';

/** Ngữ cảnh sửa chữa đọc từ API-080 (nhánh nullable `repairContext` cho Crew NORMAL). */
export type RepairContext = CrewRepairContext;

export interface RepairBootstrap {
  identity: RepairIdentity;
  taskId: string;
  projectId: string;
  /** Rowversion NGOÀI của task (API-095 dùng giá trị này), KHÔNG dùng cho lệnh sửa chữa. */
  taskVersion: string;
  repairContext: RepairContext | null;
}

/** Header bắt buộc cho mọi lệnh sửa chữa: If-Match = itemVersion của RepairItem. */
export interface RepairCommandHeaders {
  'If-Match': string;
  'Idempotency-Key': string;
  [header: string]: string;
}

export interface RepairCommandContext {
  bootstrap: RepairBootstrap;
  repairContext: RepairContext;
  headers: RepairCommandHeaders;
}

export type RepairCommand<T> = (context: RepairCommandContext) => Promise<T>;

export interface RepairCommandOptions {
  projectId?: string;
  /** Khóa idempotency ỔN ĐỊNH: dùng lại khi người dùng bấm "Thử lại" cho cùng một lệnh. */
  idempotencyKey?: string;
}

/** Bọc `itemVersion` thành giá trị If-Match đúng wire: `"<base64 rowversion>"`. */
export function itemIfMatch(itemVersion: string): string {
  return `"${itemVersion}"`;
}

/** Mã lỗi (snake_case) trong envelope problem+json của BE, hoặc null nếu không đọc được. */
export function repairCommandErrorCode(error: unknown): string | null {
  const response = (error as { response?: { data?: unknown } } | undefined)?.response;
  return parseProblemDetails(response?.data).code;
}

/** HTTP status của lỗi, hoặc null nếu không đọc được. */
export function repairCommandErrorStatus(error: unknown): number | null {
  const status = (error as { response?: { status?: unknown } } | undefined)?.response?.status;
  return typeof status === 'number' ? status : null;
}

/**
 * 409 concurrency_conflict / 428 precondition_required / 428 validation_error
 * → phải đọc lại API-080 rồi hỏi người dùng.
 */
export function isRepairVersionConflict(error: unknown): boolean {
  const code = repairCommandErrorCode(error);
  if (code === 'concurrency_conflict' || code === 'precondition_required') {
    return true;
  }
  return code === 'validation_error' && repairCommandErrorStatus(error) === 428;
}

/** 428 idempotency_key_required → lệnh chưa có key; thử lại sau khi helper cấp key. */
export function isRepairIdempotencyKeyRequired(error: unknown): boolean {
  return (
    repairCommandErrorCode(error) === 'idempotency_key_required' &&
    repairCommandErrorStatus(error) === 428
  );
}

export function repairCommandErrorMessage(error: unknown): string {
  return messageFor(repairCommandErrorCode(error));
}

function syntheticError(code: string, status: number, message: string) {
  return {
    response: {
      status,
      data: { code, message, details: [], correlationId: uuidv4(), retryable: false },
    },
  };
}

/** Đọc API-080 và bóc `repairContext` (itemVersion) tại thời điểm gọi. */
export async function readRepairBootstrap(
  taskId: string,
  projectId?: string,
): Promise<RepairBootstrap> {
  if (!isCrewResourceId(projectId) || !isCrewResourceId(taskId)) throw syntheticError('crew_identity_missing', 428, 'Project and task identity are required');
  const identity = currentRepairIdentity(projectId, taskId);
  if (!identity) throw syntheticError('crew_session_required', 401, 'A valid Crew session is required');
  const response = await getFieldInspectionTaskDetailReal(projectId, taskId);
  if (!sameRepairIdentity(identity, currentRepairIdentity(projectId, taskId))) throw syntheticError('crew_session_changed', 409, 'Crew session changed during read');
  const view = response.data;
  validateCrewTaskDetail(view, response.etag, projectId, taskId, identity.actor);
  if (view.repairContext) {
    const reason = normalRepairBlock(view, response.etag, identity.actor, 'bootstrap');
    if (reason) throw syntheticError('repair_context_invalid', 409, reason);
  }
  return {
    identity,
    taskId,
    projectId,
    taskVersion: view.version!,
    repairContext: view.repairContext ?? null,
  };
}

/**
 * Legacy command entrypoint is locked in T06-A. Later phases must dispatch an
 * immutable journal record and reconcile unknown outcomes before enabling writes.
 */
export async function withFreshItemVersion<T>(
  taskId: string,
  command: RepairCommand<T>,
  options: RepairCommandOptions = {},
): Promise<T> {
  // Legacy callbacks have no immutable durable command. Never execute them in T06-A.
  throw syntheticError('repair_execution_not_enabled', 409, 'Thi công sửa chữa chưa được mở.');
}

/* -------------------------------------------------------------------------- */
/* C-09 — lệnh thi công sửa chữa (API-156/157/161/160) và C-08 (API-159)      */
/* -------------------------------------------------------------------------- */

export function submitRepairAssessment(taskId: string, input: Record<string, unknown>, options?: RepairCommandOptions): Promise<RepairAssessmentView> {
  return withFreshItemVersion(taskId, async () => { throw new Error('repair_execution_not_enabled'); }, options);
}
export function submitRepairAttempt(taskId: string, input: Record<string, unknown>, options?: RepairCommandOptions): Promise<RepairAttemptIntakeView> {
  return withFreshItemVersion(taskId, async () => { throw new Error('repair_execution_not_enabled'); }, options);
}
export function startRepairExecution(taskId: string, input: Record<string, unknown>, options?: RepairCommandOptions): Promise<RepairExecutionStartView> {
  return withFreshItemVersion(taskId, async () => { throw new Error('repair_execution_not_enabled'); }, options);
}
export function finishRepairExecution(taskId: string, input: Record<string, unknown>, options?: RepairCommandOptions): Promise<RepairExecutionFinishView> {
  return withFreshItemVersion(taskId, async () => { throw new Error('repair_execution_not_enabled'); }, options);
}
export function supplementRepairAttempt(taskId: string, input: {fieldSubmissionId: string; expectedContentHash: string}, options?: RepairCommandOptions): Promise<RepairAttemptIntakeView> {
  return withFreshItemVersion(taskId, async () => { throw new Error('repair_execution_not_enabled'); }, options);
}
export function listRepairSubmissions(_taskId: string): Promise<never[]> {
  return Promise.reject(new Error('Chưa có nguồn danh sách lượt gửi Crew được xác minh.'));
}

/* -------------------------------------------------------------------------- */
/* C-11 — yêu cầu nhận việc (API-135/136/137)                                 */
/* -------------------------------------------------------------------------- */

// Receiving now uses crewReceivingWorkflow with explicit authenticated project identity.

/* -------------------------------------------------------------------------- */
/* Hook React                                                                  */
/* -------------------------------------------------------------------------- */

export type RepairBootstrapStatus = 'loading' | 'ready' | 'error';

export interface UseRepairBootstrapResult {
  status: RepairBootstrapStatus;
  bootstrap: RepairBootstrap | null;
  repairContext: RepairContext | null;
  itemVersion: string | null;
  errorMessage: string | null;
  reload: () => Promise<void>;
}

/**
 * Hook bootstrap cho một nhiệm vụ sửa chữa: đọc API-080, cache `repairContext.itemVersion`
 * và cho phép đọc lại thủ công. T06-A chưa mở lệnh sửa chữa.
 */
export function useRepairBootstrap(
  taskId: string,
  options: { projectId?: string } = {},
): UseRepairBootstrapResult {
  const projectId = options.projectId ?? '';
  const token = useAuthStore(s => s.token), user = useAuthStore(s => s.user), authStatus = useAuthStore(s => s.status);
  const scope = passwordSessionIdentity(token);
  const identity = currentRepairIdentity(projectId, taskId);
  const [status, setStatus] = useState<RepairBootstrapStatus>('loading');
  const [bootstrap, setBootstrap] = useState<RepairBootstrap | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sequence = useRef(0);
  const mounted = useRef(false);
  const load = useCallback(async () => {
    const request = ++sequence.current;
    const valid = () => mounted.current && sequence.current === request && !!identity && sameRepairIdentity(identity, currentRepairIdentity(projectId, taskId));
    setBootstrap(null);
    setStatus('loading');
    setErrorMessage(null);
    try {
      const next = await readRepairBootstrap(taskId, projectId);
      if (!valid()) return;
      setBootstrap(next);
      setStatus('ready');
    } catch (error) {
      if (!mounted.current || sequence.current !== request) return;
      setBootstrap(null);
      setErrorMessage(repairCommandErrorMessage(error));
      setStatus('error');
    }
  }, [taskId, projectId, scope, user, authStatus]);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
      sequence.current++;
    };
  }, [load]);

  // Hide cached data immediately on actor/sid/environment change, before the next effect.
  const visible = bootstrap && identity && sameRepairIdentity(bootstrap.identity, identity) ? bootstrap : null;

  return {
    status,
    bootstrap: visible,
    repairContext: visible?.repairContext ?? null,
    itemVersion: visible?.repairContext?.itemVersion ?? null,
    errorMessage,
    reload: load,
  };
}

/** Ref giữ khóa idempotency ổn định cho một lệnh, dùng lại khi người dùng bấm "Thử lại". */
export function useIdempotencyKey(scope: string): () => string {
  const keyRef = useRef<string | null>(null);
  return useCallback(() => {
    if (!keyRef.current) {
      keyRef.current = uuidv4();
    }
    return `${scope}:${keyRef.current}`;
  }, [scope]);
}
