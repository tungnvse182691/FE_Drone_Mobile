export interface PartUrlIssuance {
  key: string;
  partNumbers: number[];
  expiresAt?: string;
}

export interface ExpiredPartUrlReceipt {
  uploadId: string;
  partNumbers: number[];
  expiresAt: string;
  serverTime: string;
  renewalAllowed: true;
  sessionStatus: 'UPLOADING';
  reason: 'receipt_expired';
}

export type RetiredPartUrlIssuance = PartUrlIssuance & { proof: ExpiredPartUrlReceipt };

function normalizeParts(value: unknown): number[] | undefined {
  if (!Array.isArray(value) || !value.length || new Set(value).size !== value.length ||
      value.some(part => !Number.isSafeInteger(part) || part < 1 || part > 10000)) return;
  return [...value].sort((a, b) => a - b);
}

export function sameUploadPartNumbers(a: unknown, b: unknown): boolean {
  const left = normalizeParts(a);
  const right = normalizeParts(b);
  return !!left && !!right && left.length === right.length && left.every((part, index) => part === right[index]);
}

/** .NET DateTimeOffset may carry seven fractional digits. Compare without rounding to JS milliseconds. */
function receiptTime(value: unknown): [number, number] | undefined {
  if (typeof value !== 'string') return;
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,7}))?(Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.exec(value);
  if (!match || (match[3].slice(1, 3) === '14' && !match[3].endsWith(':00'))) return;
  const wallTime = Date.parse(match[1] + 'Z');
  const utc = Date.parse(match[1] + match[3]);
  if (!Number.isFinite(utc) || !Number.isFinite(wallTime) ||
      new Date(wallTime).toISOString().slice(0, 19) !== match[1]) return;
  return [utc, Number((match[2] ?? '').padEnd(7, '0'))];
}

/** Call only on the authenticated response to the exact persisted issuance POST. */
export function expiredPartUrlReceipt(
  error: unknown, uploadId: string, issuance: PartUrlIssuance,
): ExpiredPartUrlReceipt | undefined {
  const response = (error as { response?: { status?: unknown; data?: unknown } } | null)?.response;
  if (response?.status !== 409 || typeof response.data !== 'object' || !response.data || Array.isArray(response.data)) return;
  const data = response.data as Record<string, unknown>;
  if (data.code !== 'upload_part_urls_expired' || data.renewalAllowed !== true || data.reason !== 'receipt_expired' ||
      data.uploadId !== uploadId || data.sessionStatus !== 'UPLOADING' ||
      !sameUploadPartNumbers(data.partNumbers, issuance.partNumbers) ||
      typeof data.expiresAt !== 'string' || typeof data.serverTime !== 'string') return;
  const expiry = receiptTime(data.expiresAt);
  const server = receiptTime(data.serverTime);
  if (!expiry || !server || expiry[0] > server[0] || (expiry[0] === server[0] && expiry[1] > server[1])) return;
  if (issuance.expiresAt !== undefined) {
    const saved = receiptTime(issuance.expiresAt);
    if (!saved || saved[0] !== expiry[0] || saved[1] !== expiry[1]) return;
  }
  return {
    uploadId, partNumbers: normalizeParts(data.partNumbers)!, expiresAt: data.expiresAt, serverTime: data.serverTime,
    renewalAllowed: true, sessionStatus: 'UPLOADING', reason: 'receipt_expired',
  };
}
