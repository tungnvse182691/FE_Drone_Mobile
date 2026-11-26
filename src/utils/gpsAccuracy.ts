/** Display only: never write a formatted/rounded value back to capture metadata. */
export function formatGpsAccuracy(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? `Khoảng ${value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} m`
    : 'Chưa có thông tin';
}
