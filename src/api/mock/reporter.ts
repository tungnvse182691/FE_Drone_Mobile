import { ReporterReport, TrackingTimelineEvent } from '../../types/domain';
import { ReporterReportStatus } from '../../types/enums';
import { DEFECT_TYPE_CODES, DefectTypeCode } from '../../constants/defect-types';

export interface ReporterRegistrationIntent {
  intentId: string;
  email: string;
  otp: string;
  expiresInSeconds: number;
}

export interface ReportCreate {
  reporter_email: string;
  route_hint?: string;
  description: string;
  photo_uris: string[];
  coordinates: [number, number];
  defect_type?: DefectTypeCode;
}

const MOCK_OTP = '111111';
const OTP_TTL_SECONDS = 300;
const TRACKING_SEED = 882920;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const intents = new Map<string, ReporterRegistrationIntent>();
const reports = new Map<string, ReporterReport>();
const idempotencyCache = new Map<string, unknown>();
let trackingCounter = 0;

function nextTrackingCode(): string {
  trackingCounter += 1;
  return `#HH-${TRACKING_SEED + trackingCounter - 1}`;
}

function seedReports(): void {
  const seeds: ReporterReport[] = [
    {
      id: 'RPT-SEED-882910',
      tracking_code: '#HH-882910',
      reporter_email: 'nguoidan.binhchanh@gmail.com',
      route_hint: 'Tuyến ĐH.05 - Cầu Bà Lát (Km01+850), làn xe buýt hướng Vĩnh Lộc B',
      description:
        'Ổ gà sâu vỡ tấm bê tông trên làn xe buýt, đo được khoảng 1 tấm bê tông bị vỡ. Nguy cơ rất cao, xe máy đi qua có thể sụp lún.',
      photo_uris: [],
      coordinates: [106.7001, 10.783],
      defect_type: DEFECT_TYPE_CODES.POTH_DEEP,
      status: ReporterReportStatus.COMPLETED,
      submitted_at: '2026-09-18T02:15:00.000Z',
    },
    {
      id: 'RPT-SEED-104928',
      tracking_code: '#HH-104928',
      reporter_email: 'nguoidan.binhchanh@gmail.com',
      route_hint: 'Tuyến ĐH.05 - Vĩnh Lộc B, đoạn trước cầu Bà Lát về hướng Tân Kiên',
      description:
        'Nứt tấm bê tông lan rộng khoảng 1,5m, nước đọng lại sau mưa. Vị trí nằm sát mép tảm, xe tải trọng đi qua rất dễ vỡ thêm.',
      photo_uris: [],
      coordinates: [106.705, 10.7875],
      defect_type: DEFECT_TYPE_CODES.SLAB_CRK,
      status: ReporterReportStatus.INSPECTING,
      submitted_at: '2026-09-25T07:40:00.000Z',
    },
    {
      id: 'RPT-SEED-772910',
      tracking_code: '#HH-772910',
      reporter_email: 'dan.nguyen@gmail.com',
      route_hint: 'Tuyến ĐH.05 - Km02+100 gần ngã ba liên ấp',
      description:
        'Mặt đường bê tông bị bong tróc bề mặt lớn, tạo hố lõm sâu khoảng 6cm, gây nguy hiểm cho người đi xe gắn máy.',
      photo_uris: [],
      coordinates: [106.7012, 10.7845],
      defect_type: DEFECT_TYPE_CODES.POTH_DEEP,
      status: ReporterReportStatus.COMPLETED,
      submitted_at: '2026-09-20T03:30:00.000Z',
    },
    {
      id: 'RPT-SEED-664928',
      tracking_code: '#HH-664928',
      reporter_email: 'dan.nguyen@gmail.com',
      route_hint: 'Tuyến ĐH.05 - Cầu Bà Lát hướng về chợ Vĩnh Lộc',
      description:
        'Lún sụt khe co giãn giữa hai tấm đan, xe cộ qua lại bị dằn xóc mạnh.',
      photo_uris: [],
      coordinates: [106.7035, 10.786],
      defect_type: DEFECT_TYPE_CODES.SLAB_CRK,
      status: ReporterReportStatus.INSPECTING,
      submitted_at: '2026-09-26T08:15:00.000Z',
    },
  ];

  for (const seed of seeds) {
    reports.set(seed.tracking_code, seed);
  }
}

seedReports();

function withIdempotency<T>(key: string | undefined, produce: () => T): T {
  if (!key) {
    return produce();
  }
  const cached = idempotencyCache.get(key);
  if (cached !== undefined) {
    return cached as T;
  }
  const result = produce();
  idempotencyCache.set(key, result);
  return result;
}

export async function registerReporterEmail(
  email: string,
  idempotencyKey?: string,
): Promise<ReporterRegistrationIntent> {
  await delay(400);
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@')) {
    throw new Error('EMAIL_INVALID');
  }
  return withIdempotency(idempotencyKey, () => {
    const intent: ReporterRegistrationIntent = {
      intentId: `INT-${normalized}-${intents.size + 1}`,
      email: normalized,
      otp: MOCK_OTP,
      expiresInSeconds: OTP_TTL_SECONDS,
    };
    intents.set(intent.intentId, intent);
    return intent;
  });
}

export async function verifyReporterIntent(
  intentId: string,
  otp: string,
  idempotencyKey?: string,
): Promise<{ email: string }> {
  await delay(350);
  const intent = intents.get(intentId);
  if (!intent) {
    throw new Error('INTENT_NOT_FOUND');
  }
  const cleanOtp = otp.trim();
  if (
    intent.otp !== cleanOtp &&
    cleanOtp !== '111111' &&
    cleanOtp !== '1' &&
    cleanOtp !== '123456' &&
    cleanOtp !== '882910'
  ) {
    throw new Error('OTP_INVALID');
  }
  return withIdempotency(idempotencyKey, () => ({ email: intent.email }));
}

export async function submitReport(
  payload: ReportCreate,
  idempotencyKey?: string,
): Promise<{ report: ReporterReport }> {
  await delay(600);
  if (!payload.description.trim()) {
    throw new Error('DESCRIPTION_REQUIRED');
  }
  if (!payload.reporter_email.includes('@')) {
    throw new Error('EMAIL_INVALID');
  }

  return withIdempotency(idempotencyKey, () => {
    const trackingCode = nextTrackingCode();
    const report: ReporterReport = {
      id: `RPT-${trackingCounter}`,
      tracking_code: trackingCode,
      reporter_email: payload.reporter_email.trim().toLowerCase(),
      route_hint: payload.route_hint,
      description: payload.description.trim(),
      photo_uris: payload.photo_uris,
      coordinates: payload.coordinates,
      defect_type: payload.defect_type,
      status: ReporterReportStatus.SUBMITTED,
      submitted_at: new Date().toISOString(),
    };
    reports.set(trackingCode, report);
    return { report };
  });
}

export async function getReportByTracking(
  trackingCode: string,
): Promise<{ report: ReporterReport | null }> {
  await delay(300);
  const normalized = normalizeTrackingCode(trackingCode);
  return { report: reports.get(normalized) ?? null };
}

export function getReporterReportsSnapshot(): ReporterReport[] {
  return [...reports.values()];
}

export async function listMyReports(email: string): Promise<{ items: ReporterReport[] }> {
  await delay(300);
  const normalized = email.trim().toLowerCase();
  const items = [...reports.values()]
    .filter((report) => report.reporter_email === normalized)
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
  return { items };
}

export async function submitFeedback(
  trackingCode: string,
  rating: number,
  feedbackNotes: string,
): Promise<{ report: ReporterReport }> {
  await delay(400);
  const normalized = normalizeTrackingCode(trackingCode);
  const report = reports.get(normalized);
  if (!report) {
    throw new Error('REPORT_NOT_FOUND');
  }
  if (rating < 1 || rating > 5) {
    throw new Error('RATING_INVALID');
  }
  const updated: ReporterReport = {
    ...report,
    rating,
    feedback_notes: feedbackNotes.trim() || undefined,
    status: ReporterReportStatus.COMPLETED,
  };
  reports.set(normalized, updated);
  return { report: updated };
}

export function advanceReportStatus(trackingCode: string, status: ReporterReportStatus): void {
  const normalized = normalizeTrackingCode(trackingCode);
  const report = reports.get(normalized);
  if (!report) {
    return;
  }
  reports.set(normalized, { ...report, status });
}

export function normalizeTrackingCode(input: string): string {
  const trimmed = input.trim().toUpperCase();
  if (!trimmed) {
    return '';
  }
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

export function buildTrackingTimeline(
  status: ReporterReportStatus,
  submittedAt: string,
): TrackingTimelineEvent[] {
  const rejected = status === ReporterReportStatus.REJECTED;
  const order: ReporterReportStatus[] = [
    ReporterReportStatus.SUBMITTED,
    ReporterReportStatus.RECEIVED,
    ReporterReportStatus.INSPECTING,
    ReporterReportStatus.REPAIRING,
    ReporterReportStatus.COMPLETED,
  ];
  const labels: Record<ReporterReportStatus, string> = {
    [ReporterReportStatus.SUBMITTED]: 'Đã gửi phản ánh',
    [ReporterReportStatus.RECEIVED]: 'Đã tiếp nhận',
    [ReporterReportStatus.INSPECTING]: 'Đang khảo sát / đo đạc',
    [ReporterReportStatus.REPAIRING]: 'Đang sửa chữa',
    [ReporterReportStatus.COMPLETED]: 'Hoàn thành nghiệm thu',
    [ReporterReportStatus.REJECTED]: 'Không hợp lệ',
  };
  const descriptions: Record<ReporterReportStatus, string> = {
    [ReporterReportStatus.SUBMITTED]: 'Hệ thống đã ghi nhận phản ánh của bạn',
    [ReporterReportStatus.RECEIVED]: 'Ban QLDA đã tiếp nhận hồ sơ',
    [ReporterReportStatus.INSPECTING]: 'Đội khảo sát hiện trường đang kiểm tra vị trí hư hại',
    [ReporterReportStatus.REPAIRING]: 'Đội sửa chữa đang khắc phục khiếm khuyết',
    [ReporterReportStatus.COMPLETED]: 'Đã sửa chữa xong và nghiệm thu đạt yêu cầu',
    [ReporterReportStatus.REJECTED]: 'Phản ánh không thuộc phạm vi tuyến đường bê tông phụ trách',
  };

  if (rejected) {
    return [
      {
        step: ReporterReportStatus.SUBMITTED,
        label: labels[ReporterReportStatus.SUBMITTED],
        description: descriptions[ReporterReportStatus.SUBMITTED],
        occurred_at: submittedAt,
        completed: true,
      },
      {
        step: ReporterReportStatus.REJECTED,
        label: labels[ReporterReportStatus.REJECTED],
        description: descriptions[ReporterReportStatus.REJECTED],
        completed: true,
      },
    ];
  }

  const currentIndex = order.indexOf(status);
  const base = new Date(submittedAt).getTime() || Date.now();
  const stepGapMs = 1000 * 60 * 60 * 12;

  return order.map((step, index) => {
    const completed = currentIndex >= index;
    return {
      step,
      label: labels[step],
      description: descriptions[step],
      occurred_at: completed ? new Date(base + index * stepGapMs).toISOString() : undefined,
      completed,
    };
  });
}

export { MOCK_OTP };
