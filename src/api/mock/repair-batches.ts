import { RepairBatchVersion } from '../../types/domain';
import { RepairBatchStatus } from '../../types/enums';

const MOCK_BATCHES: RepairBatchVersion[] = [
  {
    id: 'RBV-001',
    batch_id: 'RB-001',
    version_no: 1,
    status: RepairBatchStatus.APPROVED,
    estimated_total_cost: 25000000,
    items: [
      { id: 'RI-001', defect_id: 'DEF-001', estimated_cost: 15000000, status: 'PENDING' },
      { id: 'RI-002', defect_id: 'DEF-002', estimated_cost: 10000000, status: 'PENDING' },
    ],
    submitted_at: '2024-09-13T11:00:00Z',
    approved_at: '2024-09-14T08:00:00Z',
  },
  {
    id: 'RBV-002',
    batch_id: 'RB-002',
    version_no: 1,
    status: RepairBatchStatus.PENDING_APPROVAL,
    estimated_total_cost: 8000000,
    items: [
      { id: 'RI-003', defect_id: 'DEF-003', estimated_cost: 8000000, status: 'PENDING' },
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
  const totalCost = batch.items.reduce((sum, item) => sum + item.estimated_cost, 0);
  return {
    data: {
      batch_id: `RB-${Date.now().toString(36).slice(-4).toUpperCase()}`,
      status: 'PENDING_APPROVAL' as const,
    },
  };
}