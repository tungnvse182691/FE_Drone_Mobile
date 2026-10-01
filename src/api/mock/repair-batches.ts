import { RepairBatchVersion } from '../../types/domain';
import { RepairBatchStatus } from '../../types/enums';

// UD-06: lớp trình bày tuyệt đối ZERO CHI PHÍ.
// Batch chỉ mang bộ 3 thông số kỹ thuật thi công: phương án xử lý + kích thước hình học + thời hạn.
const MOCK_BATCHES: RepairBatchVersion[] = [
  {
    id: 'RBV-001',
    batch_id: 'RB-001',
    version_no: 1,
    status: RepairBatchStatus.APPROVED,
    items: [
      {
        id: 'RI-001',
        defect_id: 'DEF-001',
        technical_solution: 'Phân bổ BTXM C12,5 tránh vỡ hẹn tấm',
        damage_area_m2: 0.84,
        damage_depth_cm: 4,
        damage_length_m: 1.6,
        completion_deadline: '2024-09-20',
        status: 'PENDING',
      },
      {
        id: 'RI-002',
        defect_id: 'DEF-002',
        technical_solution: 'Xử lý lún võng, lu lèn lớp móng',
        damage_area_m2: 1.1,
        damage_depth_cm: 5,
        damage_length_m: 2.0,
        completion_deadline: '2024-09-22',
        status: 'PENDING',
      },
    ],
    submitted_at: '2024-09-13T11:00:00Z',
    approved_at: '2024-09-14T08:00:00Z',
  },
  {
    id: 'RBV-002',
    batch_id: 'RB-002',
    version_no: 1,
    status: RepairBatchStatus.PENDING_APPROVAL,
    items: [
      {
        id: 'RI-003',
        defect_id: 'DEF-003',
        technical_solution: 'Vỡ mép tấm: cắt bổ cạnh, hàn lại khớp',
        damage_area_m2: 0.62,
        damage_depth_cm: 3,
        damage_length_m: 1.2,
        completion_deadline: '2024-09-25',
        status: 'PENDING',
      },
    ],
    submitted_at: '2024-09-15T14:30:00Z',
  },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function listRepairBatches(params: { project_id?: string } = {}) {
  await delay(300);
  let items = [...MOCK_BATCHES];
  return { data: { items, total: items.length } };
}

export async function submitRepairBatch(batch: RepairBatchVersion) {
  await delay(500);
  return {
    data: {
      batch_id: `RB-${Date.now().toString(36).slice(-4).toUpperCase()}`,
      status: 'PENDING_APPROVAL' as const,
      item_count: batch.items.length,
    },
  };
}