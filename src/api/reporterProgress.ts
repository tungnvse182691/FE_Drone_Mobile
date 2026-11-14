import type { OwnReportDto } from './reporterApi';

/** API-215/217 projection only. Routing and old public updates grant no milestone. */
export function publishedRepairProgress(progress: OwnReportDto['repairProgress']) {
  if (!progress || typeof progress.publishedAt !== 'string' || !Number.isFinite(Date.parse(progress.publishedAt))) return null;
  switch (progress.status) {
    case 'NOT_STARTED': return { label: 'Chưa sửa', tone: 'secondary' as const, publishedAt: progress.publishedAt };
    case 'IN_PROGRESS': return { label: 'Đang sửa', tone: 'info' as const, publishedAt: progress.publishedAt };
    case 'ACCEPTED': return { label: 'Đã nghiệm thu', tone: 'success' as const, publishedAt: progress.publishedAt };
    default: return null;
  }
}
