import { SurveyDataVersion, SurveyTask } from '../../types/domain';
import { SyncStatus, IntegrationStatus } from '../../types/enums';
import { throwMockApiError } from './errors';

/**
 * Tuyến khảo nghiệm chính ĐH.05 theo spec canonical: Vĩnh Lộc B, Cầu Bà Lát
 * (Km01+850), Tân Kiên (Km03+100). Toạ độ WGS84 theo thứ tự [longitude, latitude].
 */
export const MOCK_SURVEY_TASKS: SurveyTask[] = [
  {
    id: 'ST-001',
    code: '#HH-409-VL-B',
    title: 'Khảo sát tuyến Vĩnh Lộc B - Km00+000 đến Km01+600',
    project_id: 'P001',
    route_code: 'ĐH.05',
    section_name: 'Vĩnh Lộc B',
    location_desc: 'Tuyến ĐH.05, Vĩnh Lộc B, huyện Bình Chánh, TP.HCM',
    length_km: 1.6,
    altitude_m: 60,
    overlap_forward_ratio: 0.8,
    overlap_side_ratio: 0.7,
    format: 'DJI/4K RGB',
    sensor: '4K RGB + DSM (OpenDroneMap)',
    post_processing: 'Mosaic + DSM, tuyệt đối KHÔNG dùng LiDAR',
    access_point: {
      name: 'AP-Vĩnh Lộc B-Đầu tuyến',
      terrain_description: 'Bãi đất trống cạnh lề đường, cách mặt đường 25m',
      coordinates: [106.6980, 10.7890],
      safe_radius_m: 20,
    },
    assigned_pilot_id: 'HH-2089',
    status: 'ASSIGNED',
    due_at: '2026-09-27T12:00:00Z',
    instructions: 'Bay theo hướng Km tăng dần, giữ cao độ 60m, chụp 4K RGB + quét DSM.',
    pm_name: 'Nguyễn Văn A',
    drone_serial: 'M350-HH-02',
  },
  {
    id: 'ST-002',
    code: '#HH-409-CBL',
    title: 'Khảo sát cầu Bà Lát - Km01+850',
    project_id: 'P001',
    route_code: 'ĐH.05',
    section_name: 'Cầu Bà Lát',
    location_desc: 'Km01+850, cầu Bà Lát, huyện Bình Chánh, TP.HCM',
    length_km: 0.4,
    altitude_m: 55,
    overlap_forward_ratio: 0.8,
    overlap_side_ratio: 0.7,
    format: 'DJI/4K RGB',
    sensor: '4K RGB + DSM (OpenDroneMap)',
    post_processing: 'Mosaic + DSM, tuyệt đối KHÔNG dùng LiDAR',
    access_point: {
      name: 'AP-Cầu Bà Lát-Nhánh hạ nguồn',
      terrain_description: 'Khoảng trống trên bờ cầu phía hạ nguồn, cách lan can 15m',
      coordinates: [106.7001, 10.7830],
      safe_radius_m: 15,
    },
    assigned_pilot_id: 'HH-2089',
    status: 'ASSIGNED',
    due_at: '2026-09-27T14:00:00Z',
    instructions: 'Giữ an toàn trên nhánh cầu, tránh bay sát lan can, ưu tiên góc chụp nghiêng.',
    pm_name: 'Nguyễn Văn A',
    drone_serial: 'M350-HH-02',
  },
  {
    id: 'ST-003',
    code: '#HH-409-TK',
    title: 'Khảo sát Tân Kiên - Km03+100',
    project_id: 'P001',
    route_code: 'ĐH.05',
    section_name: 'Tân Kiên',
    location_desc: 'Km03+100, Tân Kiên, huyện Bình Chánh, TP.HCM',
    length_km: 1.2,
    altitude_m: 60,
    overlap_forward_ratio: 0.8,
    overlap_side_ratio: 0.7,
    format: 'DJI/4K RGB',
    sensor: '4K RGB + DSM (OpenDroneMap)',
    post_processing: 'Mosaic + DSM, tuyệt đối KHÔNG dùng LiDAR',
    access_point: {
      name: 'AP-Tân Kiên-Đầu hướng',
      terrain_description: 'Bãi đất cạnh đường giao nhánh, cách mặt đường 20m',
      coordinates: [106.7050, 10.7875],
      safe_radius_m: 20,
    },
    assigned_pilot_id: 'HH-2089',
    status: 'ASSIGNED',
    due_at: '2026-09-27T16:00:00Z',
    instructions: 'Kiểm tra khu vực lún võng đọng nước, chụp chi tiết mặt nước tích tụ.',
    pm_name: 'Nguyễn Văn A',
    drone_serial: 'M350-HH-02',
  },
];

const MOCK_SURVEYS: SurveyDataVersion[] = [
  {
    id: 'SDV-001',
    survey_id: 'SUR-001',
    version_no: 1,
    status: SyncStatus.LOCAL,
    integration_status: IntegrationStatus.INTACT,
    checksum_sha256: null,
    files: [
      { video_id: 'VID-001', srt_id: 'SRT-001', size_bytes: 104857600 },
    ],
    server_confirmed_at: null,
  },
  {
    id: 'SDV-002',
    survey_id: 'SUR-002',
    version_no: 1,
    status: SyncStatus.SERVER_CONFIRMED,
    integration_status: IntegrationStatus.INTACT,
    // Không có tệp thật trong mock nên không ghi checksum bịa; để null cho tới khi
    // upload thật và băm SHA-256, tránh giá trị giả bị hiểu là đã đối chiếu.
    checksum_sha256: null,
    files: [
      { video_id: 'VID-002', srt_id: null, size_bytes: 52428800 },
      { video_id: 'VID-003', srt_id: 'SRT-002', size_bytes: 26214400 },
    ],
    server_confirmed_at: '2024-09-15T10:30:00Z',
  },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function listSurveyTasks(params: { route_code?: string; status?: string } = {}) {
  await delay(300);
  let items = [...MOCK_SURVEY_TASKS];
  if (params.route_code) {
    items = items.filter((t) => t.route_code === params.route_code);
  }
  if (params.status) {
    items = items.filter((t) => t.status === params.status);
  }
  return { data: { items, total: items.length } };
}

export async function listSurveys(params: { status?: string; period?: string } = {}) {
  await delay(300);
  let items = [...MOCK_SURVEYS];
  if (params.status) {
    items = items.filter((s) => s.status === params.status);
  }
  return { data: { items, total: items.length } };
}

export async function getSurvey(id: string) {
  await delay(200);
  const item = MOCK_SURVEYS.find((s) => s.id === id);
  if (!item) {
    throwMockApiError('NOT_FOUND', { message: 'Không tìm thấy survey' });
  }
  return { data: item };
}

export async function uploadSurvey(id: string, checksum: string) {
  await delay(800);
  const item = MOCK_SURVEYS.find((s) => s.id === id);
  if (!item) {
    throwMockApiError('NOT_FOUND', { message: 'Không tìm thấy survey' });
  }
  if (!/^[a-f0-9]{64}$/i.test(checksum.trim())) {
    throwMockApiError('FILE_INTEGRITY_FAILED');
  }
  const confirmedAt = new Date().toISOString();
  item.status = SyncStatus.SERVER_CONFIRMED;
  item.checksum_sha256 = checksum.trim().toLowerCase();
  item.server_confirmed_at = confirmedAt;
  return {
    data: {
      status: SyncStatus.SERVER_CONFIRMED,
      server_confirmed_at: confirmedAt,
    },
  };
}