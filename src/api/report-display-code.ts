/**
 * Mã rút gọn CHỈ để người dân dễ nhớ/đọc trên UI (#HH-XXXXXXX).
 * Mọi thao tác vẫn dùng reportId đầy đủ; không phải định danh wire.
 */
export function reporterReportCode(reportId: string): string {
  const compact = reportId.replace(/[^0-9a-z]/gi, '');
  return `#HH-${compact.slice(0, 8).toUpperCase()}`;
}
