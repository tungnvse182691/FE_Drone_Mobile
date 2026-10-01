import { Defect, FieldInspectionTask, GroundTruthMeasurement, FastTrackPolicyVersion } from '../../types/domain';
import { DefectStatus, Severity, SyncStatus, FieldInspectionTaskStatus } from '../../types/enums';
import { DEFECT_TYPE_CODES } from '../../constants/defect-types';
import { FAST_TRACK_POLICY as CANONICAL_FAST_TRACK_POLICY } from './crew-inspection';

/**
 * Nguồn chuẩn duy nhất của chính sách Fast Track là `crew-inspection.ts`.
 * Ở đây chỉ tái xuất để giữ tên cũ, tránh hai bản `FastTrackPolicyVersion` lệch nhau.
 */
export const FAST_TRACK_POLICY: FastTrackPolicyVersion = CANONICAL_FAST_TRACK_POLICY;

const MOCK_DEFECTS: Defect[] = [
  {
    id: 'DEF-001',
    project_id: 'P001',
    road_section_version_id: 'RSV-001',
    defect_type_code: DEFECT_TYPE_CODES.POTH_DEEP,
    severity: Severity.HIGH,
    status: DefectStatus.OPEN,
    geometry: { type: 'Point', coordinates: [106.7001, 10.7830] },
    reported_at: '2024-09-10T08:15:00Z',
    notes: 'Ổ gà sâu trên làn xe buýt, Tuyến ĐH.05 - Cầu Bà Lát (Km01+850)',
  },
  {
    id: 'DEF-002',
    project_id: 'P001',
    road_section_version_id: 'RSV-002',
    defect_type_code: DEFECT_TYPE_CODES.SLAB_CRK,
    severity: Severity.LOW,
    status: DefectStatus.OPEN,
    geometry: { type: 'Point', coordinates: [106.7105, 10.7912] },
    reported_at: '2024-09-12T14:30:00Z',
  },
  {
    id: 'DEF-003',
    project_id: 'P001',
    road_section_version_id: 'RSV-001',
    defect_type_code: DEFECT_TYPE_CODES.DEPR_POND,
    severity: Severity.MEDIUM,
    status: DefectStatus.VERIFIED,
    geometry: { type: 'Point', coordinates: [106.7050, 10.7875] },
    reported_at: '2024-09-14T09:00:00Z',
  },
  {
    id: 'DEF-004',
    project_id: 'P001',
    road_section_version_id: 'RSV-002',
    defect_type_code: DEFECT_TYPE_CODES.EDGE_BRK,
    severity: Severity.HIGH,
    status: DefectStatus.OPEN,
    geometry: { type: 'Point', coordinates: [106.7005, 10.7834] },
    reported_at: '2024-09-15T08:40:00Z',
    notes: 'Vỡ mép tấm bê tông lan sang bề mặt lái xe, Tuyến ĐH.05 - Cầu Bà Lát',
  },
  {
    id: 'DEF-005',
    project_id: 'P001',
    road_section_version_id: 'RSV-003',
    defect_type_code: DEFECT_TYPE_CODES.SHLD_EROS,
    severity: Severity.MEDIUM,
    status: DefectStatus.OPEN,
    geometry: { type: 'Point', coordinates: [106.6980, 10.7890] },
    reported_at: '2024-09-16T10:20:00Z',
    notes: 'Xói lở vai đường, Tuyến ĐH.05 - Vĩnh Lộc B',
  },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function listDefects(params: { project_id?: string; status?: string } = {}) {
  await delay(300);
  let items = [...MOCK_DEFECTS];
  if (params.project_id) {
    items = items.filter((d) => d.project_id === params.project_id);
  }
  if (params.status) {
    items = items.filter((d) => d.status === params.status);
  }
  return { data: { items, total: items.length } };
}

export async function createFieldInspection(
  defectId: string,
  measurement: Omit<GroundTruthMeasurement, 'session_id' | 'id'>,
) {
  await delay(500);
  return {
    data: {
      task_status: FieldInspectionTaskStatus.COMPLETED,
    },
  };
}

export async function getFastTrackPolicy(): Promise<{ data: FastTrackPolicyVersion }> {
  await delay(200);
  return { data: FAST_TRACK_POLICY };
}