import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../api/client';
import { messageFor } from '../api/errorCatalog';
import { parseProblemDetails } from '../api/problemDetails';
import { uuidv4 } from '../utils/uuid';
import {
  MOCK_CREW_PROJECT_ID,
  ackReceivingRequest as ackReceivingRequestMock,
  finishRepairExecution as finishRepairExecutionMock,
  getCrewFieldTaskView,
  getReceivingRequest as getReceivingRequestMock,
  listCrewFieldSubmissions,
  listReceivingRequests as listReceivingRequestsMock,
  startRepairExecution as startRepairExecutionMock,
  submitRepairAssessment as submitRepairAssessmentMock,
  submitRepairAttempt as submitRepairAttemptMock,
  supplementRepairAttempt as supplementRepairAttemptMock,
  type BusinessDutyView,
  type BusinessRequestAckInput,
  type CrewFieldSubmissionView,
  type CrewFieldTaskViewFact,
  type CrewRepairContext,
  type RepairAssessmentView,
  type RepairAttemptIntakeView,
  type RepairExecutionFinishView,
  type RepairExecutionStartView,
} from '../api/mock/tasks';

/**
 * BE thật chưa sẵn sàng (`API_BASE_URL` vẫn là placeholder) — mặc định chạy mock.
 * Cùng quy ước với `USE_MOCK_UPLOAD` ở `src/store/uploads.ts`.
 */
const USE_MOCK_CREW_REPAIR = true;

/** Ngữ cảnh sửa chữa đọc từ API-080 (nhánh nullable `repairContext` cho Crew NORMAL). */
export type RepairContext = CrewRepairContext;

export interface RepairBootstrap {
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

/** If-Match của API-136/137 là ETag thô (đã có sẵn dạng `W/"n"`), KHÔNG bọc thêm nháy kép. */
export function receivingIfMatch(version: string): string {
  return version;
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

/* -------------------------------------------------------------------------- */
/* Transport: mock (đang bật) hoặc HTTP thật theo hợp đồng 04_API-Contracts.   */
/* -------------------------------------------------------------------------- */

interface CrewRepairTransport {
  fetchTask(taskId: string, projectId: string): Promise<CrewFieldTaskViewFact>;
  listSubmissions(taskId: string, itemId: string, projectId: string): Promise<CrewFieldSubmissionView[]>;
  supplement(
    taskId: string,
    repairContext: RepairContext,
    projectId: string,
    input: { fieldSubmissionId: string; expectedContentHash: string },
    headers: RepairCommandHeaders,
  ): Promise<RepairAttemptIntakeView>;
  assess(
    taskId: string,
    repairContext: RepairContext,
    projectId: string,
    input: Record<string, unknown>,
    headers: RepairCommandHeaders,
  ): Promise<RepairAssessmentView>;
  attempt(
    taskId: string,
    repairContext: RepairContext,
    projectId: string,
    input: Record<string, unknown>,
    headers: RepairCommandHeaders,
  ): Promise<RepairAttemptIntakeView>;
  startExecution(
    taskId: string,
    repairContext: RepairContext,
    projectId: string,
    input: Record<string, unknown>,
    headers: RepairCommandHeaders,
  ): Promise<RepairExecutionStartView>;
  finishExecution(
    taskId: string,
    repairContext: RepairContext,
    projectId: string,
    input: Record<string, unknown>,
    headers: RepairCommandHeaders,
  ): Promise<RepairExecutionFinishView>;
  listReceiving(
    projectId: string,
    params: { scopeId?: string; after?: string; limit?: number },
  ): Promise<{ items: BusinessDutyView[]; continuation: string | null }>;
  getReceiving(projectId: string, requestId: string): Promise<BusinessDutyView>;
  ackReceiving(
    projectId: string,
    requestId: string,
    input: BusinessRequestAckInput,
    headers: { 'If-Match': string; 'Idempotency-Key': string },
  ): Promise<BusinessDutyView>;
}

const mockCrewRepairTransport: CrewRepairTransport = {
  fetchTask: (taskId) => getCrewFieldTaskView(taskId),
  listSubmissions: (taskId) => listCrewFieldSubmissions(taskId),
  supplement: (taskId, _ctx, _projectId, input, headers) =>
    supplementRepairAttemptMock(taskId, input, headers),
  assess: (taskId, _ctx, _projectId, input, headers) =>
    submitRepairAssessmentMock(taskId, input, headers),
  attempt: (taskId, _ctx, _projectId, input, headers) =>
    submitRepairAttemptMock(taskId, input, headers),
  startExecution: (taskId, _ctx, _projectId, input, headers) =>
    startRepairExecutionMock(taskId, input, headers),
  finishExecution: (taskId, _ctx, _projectId, input, headers) =>
    finishRepairExecutionMock(taskId, input, headers),
  listReceiving: (_projectId, params) => listReceivingRequestsMock(params),
  getReceiving: (_projectId, requestId) => getReceivingRequestMock(requestId),
  ackReceiving: (_projectId, requestId, input, headers) =>
    ackReceivingRequestMock(requestId, input, headers),
};

function repairItemPath(projectId: string, ctx: RepairContext, taskId: string, suffix: string): string {
  return `/projects/${projectId}/repair-packages/${ctx.packageId}/items/${ctx.itemId}/tasks/${taskId}/${suffix}`;
}

const httpCrewRepairTransport: CrewRepairTransport = {
  async fetchTask(taskId, projectId) {
    const response = await apiClient.get<CrewFieldTaskViewFact>(
      `/projects/${projectId}/field-inspection-tasks/${taskId}`,
    );
    return response.data;
  },
  async listSubmissions(taskId, itemId, projectId) {
    const response = await apiClient.get<{ items?: CrewFieldSubmissionView[] }>(
      `/projects/${projectId}/repair-packages/${itemId}/field-submissions`,
    );
    return response.data.items ?? [];
  },
  async supplement(taskId, ctx, projectId, input, headers) {
    const response = await apiClient.post<RepairAttemptIntakeView>(
      repairItemPath(projectId, ctx, taskId, 'attempts/supplements'),
      input,
      { headers },
    );
    return response.data;
  },
  async assess(taskId, ctx, projectId, input, headers) {
    const response = await apiClient.post<RepairAssessmentView>(
      repairItemPath(projectId, ctx, taskId, 'assessment'),
      input,
      { headers },
    );
    return response.data;
  },
  async attempt(taskId, ctx, projectId, input, headers) {
    const response = await apiClient.post<RepairAttemptIntakeView>(
      repairItemPath(projectId, ctx, taskId, 'attempts'),
      input,
      { headers },
    );
    return response.data;
  },
  async startExecution(taskId, ctx, projectId, input, headers) {
    const response = await apiClient.post<RepairExecutionStartView>(
      repairItemPath(projectId, ctx, taskId, 'execution-start'),
      input,
      { headers },
    );
    return response.data;
  },
  async finishExecution(taskId, ctx, projectId, input, headers) {
    const response = await apiClient.post<RepairExecutionFinishView>(
      repairItemPath(projectId, ctx, taskId, 'execution-finish'),
      input,
      { headers },
    );
    return response.data;
  },
  async listReceiving(projectId, params) {
    const response = await apiClient.get<{ items: BusinessDutyView[]; continuation: string | null }>(
      `/projects/${projectId}/receiving-requests`,
      { params },
    );
    return response.data;
  },
  async getReceiving(projectId, requestId) {
    const response = await apiClient.get<BusinessDutyView>(
      `/projects/${projectId}/receiving-requests/${requestId}`,
    );
    return response.data;
  },
  async ackReceiving(projectId, requestId, input, headers) {
    const response = await apiClient.post<BusinessDutyView>(
      `/projects/${projectId}/receiving-requests/${requestId}/ack`,
      input,
      { headers },
    );
    return response.data;
  },
};

export const crewRepairTransport: CrewRepairTransport = USE_MOCK_CREW_REPAIR
  ? mockCrewRepairTransport
  : httpCrewRepairTransport;

export const CREW_REPAIR_PROJECT_ID = MOCK_CREW_PROJECT_ID;

/* -------------------------------------------------------------------------- */
/* C04 — bootstrap + itemVersion                                              */
/* -------------------------------------------------------------------------- */

/** Đọc API-080 và bóc `repairContext` (itemVersion) tại thời điểm gọi. */
export async function readRepairBootstrap(
  taskId: string,
  projectId: string = CREW_REPAIR_PROJECT_ID,
): Promise<RepairBootstrap> {
  const view = await crewRepairTransport.fetchTask(taskId, projectId);
  return {
    taskId,
    projectId,
    taskVersion: view.version,
    repairContext: view.repairContext ?? null,
  };
}

/**
 * C04: đọc lại API-080 NGAY TRƯỚC mỗi lệnh sửa chữa để lấy `itemVersion` mới nhất,
 * gắn `If-Match: "<itemVersion>"` + `Idempotency-Key` ổn định, rồi mới chạy lệnh.
 *
 * Khi gặp 409/412 (version lệch) sẽ đọc lại API-080 để làm mới phiên bản nhưng
 * KHÔNG tự retry — màn hình phải hỏi người dùng có thử lại với phiên bản mới không.
 */
export async function withFreshItemVersion<T>(
  taskId: string,
  command: RepairCommand<T>,
  options: RepairCommandOptions = {},
): Promise<T> {
  const projectId = options.projectId ?? CREW_REPAIR_PROJECT_ID;
  const bootstrap = await readRepairBootstrap(taskId, projectId);

  if (!bootstrap.repairContext) {
    throw syntheticError(
      'repair_anchor_not_ready',
      409,
      'Nhiệm vụ chưa có hạng mục sửa chữa khả dụng (chế độ chỉ đo hoặc chưa được phân công).',
    );
  }

  const headers: RepairCommandHeaders = {
    'If-Match': itemIfMatch(bootstrap.repairContext.itemVersion),
    'Idempotency-Key': options.idempotencyKey ?? uuidv4(),
  };

  try {
    return await command({ bootstrap, repairContext: bootstrap.repairContext, headers });
  } catch (error) {
    if (isRepairVersionConflict(error)) {
      try {
        await readRepairBootstrap(taskId, projectId);
      } catch {
        /* giữ nguyên lỗi gốc để UI xử lý */
      }
    }
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* C-09 — lệnh thi công sửa chữa (API-156/157/161/160) và C-08 (API-159)      */
/* -------------------------------------------------------------------------- */

export function submitRepairAssessment(
  taskId: string,
  input: Record<string, unknown>,
  options?: RepairCommandOptions,
): Promise<RepairAssessmentView> {
  return withFreshItemVersion(
    taskId,
    ({ repairContext, bootstrap, headers }) =>
      crewRepairTransport.assess(taskId, repairContext, bootstrap.projectId, input, headers),
    options,
  );
}

export function submitRepairAttempt(
  taskId: string,
  input: Record<string, unknown>,
  options?: RepairCommandOptions,
): Promise<RepairAttemptIntakeView> {
  return withFreshItemVersion(
    taskId,
    ({ repairContext, bootstrap, headers }) =>
      crewRepairTransport.attempt(taskId, repairContext, bootstrap.projectId, input, headers),
    options,
  );
}

export function startRepairExecution(
  taskId: string,
  input: Record<string, unknown>,
  options?: RepairCommandOptions,
): Promise<RepairExecutionStartView> {
  return withFreshItemVersion(
    taskId,
    ({ repairContext, bootstrap, headers }) =>
      crewRepairTransport.startExecution(taskId, repairContext, bootstrap.projectId, input, headers),
    options,
  );
}

export function finishRepairExecution(
  taskId: string,
  input: Record<string, unknown>,
  options?: RepairCommandOptions,
): Promise<RepairExecutionFinishView> {
  return withFreshItemVersion(
    taskId,
    ({ repairContext, bootstrap, headers }) =>
      crewRepairTransport.finishExecution(taskId, repairContext, bootstrap.projectId, input, headers),
    options,
  );
}

/**
 * C-08 — đính chính một lượt sửa đã gửi (API-159). Đi qua `withFreshItemVersion` nên
 * luôn mang If-Match = itemVersion mới nhất của RepairItem.
 */
export function supplementRepairAttempt(
  taskId: string,
  input: { fieldSubmissionId: string; expectedContentHash: string },
  options?: RepairCommandOptions,
): Promise<RepairAttemptIntakeView> {
  return withFreshItemVersion(
    taskId,
    ({ repairContext, bootstrap, headers }) =>
      crewRepairTransport.supplement(taskId, repairContext, bootstrap.projectId, input, headers),
    options,
  );
}

/**
 * Danh sách lượt sửa đã gửi để chọn ở C-08. BE chưa có endpoint liệt kê (API-096 chỉ đọc
 * một submission theo id — xem `01_Crew-Screen-API-Matrix.md` dòng C-08) nên hiện dùng mock.
 */
export function listRepairSubmissions(taskId: string): Promise<CrewFieldSubmissionView[]> {
  return crewRepairTransport.listSubmissions(taskId, '', CREW_REPAIR_PROJECT_ID);
}

/* -------------------------------------------------------------------------- */
/* C-11 — yêu cầu nhận việc (API-135/136/137)                                 */
/* -------------------------------------------------------------------------- */

export function listReceivingRequests(
  params: { scopeId?: string; after?: string; limit?: number } = {},
): Promise<{ items: BusinessDutyView[]; continuation: string | null }> {
  return crewRepairTransport.listReceiving(CREW_REPAIR_PROJECT_ID, params);
}

export function getReceivingRequest(requestId: string): Promise<BusinessDutyView> {
  return crewRepairTransport.getReceiving(CREW_REPAIR_PROJECT_ID, requestId);
}

export function ackReceivingRequest(
  requestId: string,
  version: string,
  input: BusinessRequestAckInput = {},
  idempotencyKey?: string,
): Promise<BusinessDutyView> {
  return crewRepairTransport.ackReceiving(CREW_REPAIR_PROJECT_ID, requestId, input, {
    'If-Match': receivingIfMatch(version),
    'Idempotency-Key': idempotencyKey ?? uuidv4(),
  });
}

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
 * và cho phép đọc lại thủ công. Lệnh sửa chữa vẫn phải đi qua `withFreshItemVersion`.
 */
export function useRepairBootstrap(
  taskId: string,
  options: { projectId?: string } = {},
): UseRepairBootstrapResult {
  const projectId = options.projectId ?? CREW_REPAIR_PROJECT_ID;
  const [status, setStatus] = useState<RepairBootstrapStatus>('loading');
  const [bootstrap, setBootstrap] = useState<RepairBootstrap | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(null);
    try {
      const next = await readRepairBootstrap(taskId, projectId);
      setBootstrap(next);
      setStatus('ready');
    } catch (error) {
      setBootstrap(null);
      setErrorMessage(repairCommandErrorMessage(error));
      setStatus('error');
    }
  }, [taskId, projectId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus('loading');
      setErrorMessage(null);
      try {
        const next = await readRepairBootstrap(taskId, projectId);
        if (!cancelled) {
          setBootstrap(next);
          setStatus('ready');
        }
      } catch (error) {
        if (!cancelled) {
          setBootstrap(null);
          setErrorMessage(repairCommandErrorMessage(error));
          setStatus('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [taskId, projectId]);

  return {
    status,
    bootstrap,
    repairContext: bootstrap?.repairContext ?? null,
    itemVersion: bootstrap?.repairContext?.itemVersion ?? null,
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
