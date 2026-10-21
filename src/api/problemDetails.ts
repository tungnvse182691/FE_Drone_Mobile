/**
 * Bóc `application/problem+json` theo hợp đồng 17_10.
 *
 * Backend gắn mã lỗi máy đọc được ở KHÓA TOP-LEVEL `code`
 * (`ProblemDetails.Extensions["code"]` được serialize phẳng ra gốc JSON),
 * KHÔNG nằm trong `data.extensions.code`. Vì vậy chỉ đọc `data.code`.
 */
export interface ParsedProblemDetails {
  code: string | null;
  title: string | null;
  detail: string | null;
  traceId: string | null;
}

const EMPTY: ParsedProblemDetails = {
  code: null,
  title: null,
  detail: null,
  traceId: null,
};

function readString(bag: Record<string, unknown>, key: string): string | null {
  const value = bag[key];
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function parseProblemDetails(data: unknown): ParsedProblemDetails {
  if (typeof data !== 'object' || data === null) {
    return { ...EMPTY };
  }
  const bag = data as Record<string, unknown>;
  return {
    code: readString(bag, 'code'),
    title: readString(bag, 'title'),
    detail: readString(bag, 'detail'),
    traceId: readString(bag, 'traceId'),
  };
}
