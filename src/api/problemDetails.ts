/**
 * Bóc `application/problem+json` theo hợp đồng 17_10.
 *
 * - Mã lỗi máy đọc được ở KHÓA TOP-LEVEL `code`
 *   (`ProblemDetails.Extensions["code"]` được serialize phẳng ra gốc JSON),
 *   KHÔNG nằm trong `data.extensions.code`.
 * - Mã tương quan của BE là `X-Correlation-ID` / `correlationId` — KHÔNG có `traceId`.
 * - Lỗi theo trường nằm trong `errors: { [field]: string[] }`.
 */
export interface ParsedProblemDetails {
  code: string | null;
  title: string | null;
  detail: string | null;
  correlationId: string | null;
  fieldErrors?: Record<string, string[]>;
}

const EMPTY: ParsedProblemDetails = {
  code: null,
  title: null,
  detail: null,
  correlationId: null,
};

function readString(bag: Record<string, unknown>, key: string): string | null {
  const value = bag[key];
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function readFieldErrors(bag: Record<string, unknown>): Record<string, string[]> | undefined {
  const raw = bag.errors;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return undefined;
  }
  const result: Record<string, string[]> = {};
  for (const [field, value] of Object.entries(raw as Record<string, unknown>)) {
    const messages = Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
      : typeof value === 'string' && value.trim() !== ''
        ? [value]
        : [];
    if (messages.length > 0) {
      result[field] = messages;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export function parseProblemDetails(data: unknown): ParsedProblemDetails {
  if (typeof data !== 'object' || data === null) {
    return { ...EMPTY };
  }
  const bag = data as Record<string, unknown>;
  const fieldErrors = readFieldErrors(bag);
  return {
    code: readString(bag, 'code'),
    title: readString(bag, 'title'),
    detail: readString(bag, 'detail'),
    correlationId: readString(bag, 'correlationId'),
    ...(fieldErrors ? { fieldErrors } : {}),
  };
}
