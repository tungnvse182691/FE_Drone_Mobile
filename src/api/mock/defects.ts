import { Defect, FieldInspectionTask, GroundTruthMeasurement } from '../../types/domain';
import { DefectStatus, Severity, SyncStatus, FieldInspectionTaskStatus } from '../../types/enums';
import { DEFECT_TYPE_CODES } from '../../constants/defect-types';

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