/**
 * Vị trí GPS dùng chung (wire `PositionDto`) + vị trí bằng chứng của phản ánh
 * (wire `ReportEvidenceLocationDto`).
 *
 * Nguồn sự thật:
 *  - docs/specs/04_API-Contracts/03_DTO-and-Schema-Reference.md
 *    (## Schema PositionDto / PointDto / ReportEvidenceLocationDto / ReportEvidenceInputDto)
 *
 * Bất biến (KHÔNG được vi phạm):
 *  1. `PositionDto.source` bắt buộc, chỉ nhận `EXIF | MANUAL | SURVEY | DERIVED`.
 *  2. `(0,0)` là rác GPS (Null Island — thiết bị không có fix) → cấm gửi lên wire;
 *     thà trả `null` còn hơn bịa tọa độ.
 *  3. `accuracyMeters` là bán kính sai số 68% (mét); `null` khi thiết bị không cung cấp —
 *     KHÔNG tự chế số.
 */

/** `## Schema PointDto` — `point` của `PositionDto`. */
export interface PointDto {
  /** Kinh độ, `-180..180`. */
  longitude: number;
  /** Vĩ độ, `-90..90`. */
  latitude: number;
}

/** `## Schema PositionDto.source` — bắt buộc. */
export type PositionSource = 'EXIF' | 'MANUAL' | 'SURVEY' | 'DERIVED';

export const POSITION_SOURCES: readonly PositionSource[] = [
  'EXIF',
  'MANUAL',
  'SURVEY',
  'DERIVED',
];

/** `## Schema PositionDto` — required `point`, `source`. */
export interface PositionDto {
  point: PointDto;
  source: PositionSource;
  accuracyMeters?: number | null;
  capturedAt?: string | null;
}

/**
 * `## Schema ReportEvidenceInputDto.locationSource` — nguồn tọa độ ảnh bằng chứng
 * của người dân (enum riêng của Reporter, KHÔNG phải `PositionDto.source`).
 */
export type ReportLocationSource = 'UNKNOWN' | 'CAPTURE' | 'EXIF' | 'MANUAL';

export const REPORT_LOCATION_SOURCES: readonly ReportLocationSource[] = [
  'UNKNOWN',
  'CAPTURE',
  'EXIF',
  'MANUAL',
];

/** `## Schema ReportEvidenceLocationDto` — required `[]`, mọi trường nullable. */
export interface ReportEvidenceLocationDto {
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
}

/** Ngưỡng coi hai trục là "0" — 1e-6 độ (~0,11 m) để không nuốt toạ độ hợp lệ. */
const ZERO_EPSILON = 1e-6;

export function isPlausibleLatitude(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isPlausibleLongitude(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180;
}

/** Rác GPS `(0,0)` — cả hai trục gần như đúng 0. */
export function isZeroCoordinate(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): boolean {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return false;
  }
  return Math.abs(latitude) < ZERO_EPSILON && Math.abs(longitude) < ZERO_EPSILON;
}

/** Ảnh bằng chứng của người dân: có toạ độ hợp lệ hay không (ẩn luôn rác `(0,0)`). */
export function hasUsableCoordinate(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): boolean {
  if (!isPlausibleLatitude(latitude) || !isPlausibleLongitude(longitude)) {
    return false;
  }
  return !isZeroCoordinate(latitude, longitude);
}

/** Nguồn tọa độ ảnh hiện trường: có GPS thật → `CAPTURE`, ngược lại `UNKNOWN`. */
export function locationSourceFor(hasCoordinates: boolean): ReportLocationSource {
  // Không có GPS thì ghi UNKNOWN — TUYỆT ĐỐI không bịa tọa độ.
  return hasCoordinates ? 'CAPTURE' : 'UNKNOWN';
}

/** `UNKNOWN` → `DERIVED` (không có nguồn đo trực tiếp); `CAPTURE` ≈ GPS thiết bị lúc chụp → `EXIF`. */
export function toPositionSource(source: ReportLocationSource): PositionSource {
  switch (source) {
    case 'MANUAL':
      return 'MANUAL';
    case 'EXIF':
    case 'CAPTURE':
      return 'EXIF';
    case 'UNKNOWN':
    default:
      return 'DERIVED';
  }
}

/**
 * Dựng `PositionDto` an toàn: toạ độ không hợp lệ hoặc rác `(0,0)` → `null`.
 * `accuracyMeters` chỉ giữ khi là số hữu hạn không âm.
 */
export function buildPosition(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  source: PositionSource,
  accuracyMeters?: number | null,
  capturedAt?: string | null,
): PositionDto | null {
  if (!hasUsableCoordinate(latitude, longitude)) {
    return null;
  }
  const accuracy =
    typeof accuracyMeters === 'number' && Number.isFinite(accuracyMeters) && accuracyMeters >= 0
      ? accuracyMeters
      : null;
  return {
    point: { latitude: latitude as number, longitude: longitude as number },
    source,
    accuracyMeters: accuracy,
    capturedAt: capturedAt ?? null,
  };
}

/**
 * Dựng `ReportEvidenceLocationDto` an toàn: toạ độ không hợp lệ hoặc rác `(0,0)` → `null`
 * (bỏ hẳn khối `location` thay vì gửi `{latitude:0, longitude:0}`).
 */
export function buildReportEvidenceLocation(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  accuracyMeters?: number | null,
): ReportEvidenceLocationDto | null {
  if (!hasUsableCoordinate(latitude, longitude)) {
    return null;
  }
  const accuracy =
    typeof accuracyMeters === 'number' && Number.isFinite(accuracyMeters) && accuracyMeters >= 0
      ? accuracyMeters
      : null;
  return {
    latitude: latitude as number,
    longitude: longitude as number,
    accuracyMeters: accuracy,
  };
}
