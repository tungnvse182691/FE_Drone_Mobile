import { Defect, FieldInspectionTask, GroundTruthMeasurement, FastTrackPolicyVersion } from '../../types/domain';
import { DefectStatus, Severity, SyncStatus, FieldInspectionTaskStatus } from '../../types/enums';
import { DEFECT_TYPE_CODES } from '../../constants/defect-types';

export const FAST_TRACK_POLICY: FastTrackPolicyVersion = {
  id: 'FTP-2026-V1',
  version_code: 'FTP-2026-V1',
  max_area_m2: 1.0,
  max_depth_cm: 5.0,
  max_length_m: 2.0,
  allowed_defect_codes: [
    DEFECT_TYPE_CODES.POTH_DEEP,
    DEFECT_TYPE_CODES.DEPR_POND,
    DEFECT_TYPE_CODES.EDGE_BRK,
    DEFECT_TYPE_CODES.SLAB_CRK,
    DEFECT_TYPE_CODES.SHLD_EROS,
  ],
  effective_from: '2026-01-01T00:00:00Z',
  effective_to: '2026-12-31T23:59:59Z',
};

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