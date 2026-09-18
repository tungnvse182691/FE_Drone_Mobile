import { SurveyDataVersion } from '../../types/domain';
import { SyncStatus, IntegrationStatus } from '../../types/enums';

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
    checksum_sha256: 'a1b2c3d4e5f6',
    files: [
      { video_id: 'VID-002', srt_id: null, size_bytes: 52428800 },
      { video_id: 'VID-003', srt_id: 'SRT-002', size_bytes: 26214400 },
    ],
    server_confirmed_at: '2024-09-15T10:30:00Z',
  },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    throw { response: { status: 404, data: { message: 'Không tìm thấy survey' } } };
  }
  return { data: item };
}

export async function uploadSurvey(id: string, _checksum: string) {
  await delay(800);
  const item = MOCK_SURVEYS.find((s) => s.id === id);
  if (!item) {
    throw { response: { status: 404, data: { message: 'Không tìm thấy survey' } } };
  }
  return {
    data: {
      status: SyncStatus.SERVER_CONFIRMED,
      server_confirmed_at: new Date().toISOString(),
    },
  };
}