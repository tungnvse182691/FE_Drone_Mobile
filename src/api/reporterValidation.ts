/** BE uses trimmed UTF-16 string length for both Reporter operations. */
export function reportDescriptionError(value: string): string | null {
  const length = value.trim().length;
  return length >= 1 && length <= 1000 ? null : 'Mô tả phải từ 1 đến 1.000 ký tự sau khi bỏ khoảng trắng đầu và cuối.';
}

export const REPORTER_CAPTURE_POLICY = 'CAMERA_FIRST_GPS_V1' as const;
export const REPORTER_MAX_PHOTOS = 2;
/** Local admission for new capture rounds only; never rewrites legacy commands. */
export function reporterCaptureError(photos: readonly { captureRole?: 'PRIMARY' | 'SECONDARY'; photoLocation?: unknown; locationSource?: string }[], submitting = false): string | null {
  if (photos.length > REPORTER_MAX_PHOTOS) return 'Mỗi lượt chỉ chụp tối đa 2 ảnh.';
  if (submitting && (!photos.length || !photos.some(p => p.captureRole === 'PRIMARY'))) return 'Chụp ảnh chính để gửi; GPS chỉ được lấy cùng ảnh chính.';
  if (photos.some(p => p.captureRole !== 'PRIMARY' && p.captureRole !== 'SECONDARY') || new Set(photos.map(p => p.captureRole)).size !== photos.length) return 'Chỉ dùng ảnh chụp camera trong lượt này.';
  if (photos.some(p => p.captureRole === 'PRIMARY' && (p.locationSource !== 'CAPTURE' && p.locationSource !== 'UNKNOWN' || p.photoLocation === undefined || (p.locationSource === 'UNKNOWN') !== (p.photoLocation === null)))) return 'Giữ đúng vị trí gốc của ảnh chính.';
  if (photos.some(p => p.captureRole === 'SECONDARY' && (p.photoLocation !== null || p.locationSource !== 'UNKNOWN'))) return 'Ảnh phụ không được dùng vị trí của ảnh khác.';
  return null;
}
