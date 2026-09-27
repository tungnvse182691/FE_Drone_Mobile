import { RepairWorkOrder } from '../../types/domain';
import { TaskMode, FastTrackEligibility } from '../../types/enums';
import { DEFECT_TYPE_CODES } from '../../constants/defect-types';

export const MOCK_WORK_ORDERS: RepairWorkOrder[] = [
  {
    id: 'WO-01',
    title: 'Đổ bù ổ gà sâu vỡ tấm bê tông Km02+150',
    task_mode: TaskMode.INSPECT_AND_REPAIR,
    assigned_crew_id: 'HH-RC-084',
    route_code: 'ĐH.05',
    section_name: 'Cầu Bà Lát',
    target_defect_id: 'DEF-001',
    defect_type_code: DEFECT_TYPE_CODES.POTH_DEEP,
    due_at: '2026-09-27T17:00:00Z',
    instructions:
      'Đục tẩy toàn bộ mảng bê tông vỡ vụn, quét hồ dầu xi măng liên kết, đổ bù bê tông TCVN 10380:2014. Đủ điều kiện Fast Track sửa nhanh tại chỗ nếu diện tích <= 1.0m2.',
    target_coordinates: [10.7830, 106.7001],
    fast_track_eligible: FastTrackEligibility.ELIGIBLE,
    status: 'ASSIGNED',
    created_at: '2026-09-27T07:30:00Z',
  },
  {
    id: 'WO-02',
    title: 'Khảo sát đợt gom nứt tấm bê tông Km01+850',
    task_mode: TaskMode.MEASURE_ONLY,
    assigned_crew_id: 'HH-RC-084',
    route_code: 'ĐH.05',
    section_name: 'Vĩnh Lộc B',
    target_defect_id: 'DEF-002',
    defect_type_code: DEFECT_TYPE_CODES.SLAB_CRK,
    due_at: '2026-09-27T12:00:00Z',
    instructions:
      'Đợt gom 5 điểm khuyết tật trên tuyến. Bắt buộc CHỈ ĐO ĐẠC hiện trường theo US-35/BR-09, TUYỆT ĐỐI CẤM tự ý sửa tại chỗ.',
    target_coordinates: [10.7875, 106.7050],
    fast_track_eligible: FastTrackEligibility.LOCKED_BY_PM,
    status: 'ASSIGNED',
    created_at: '2026-09-27T08:00:00Z',
  },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function listWorkOrders(params: { crew_id?: string; mode?: string } = {}) {
  await delay(300);
  let items = [...MOCK_WORK_ORDERS];
  if (params.crew_id) {
    items = items.filter((w) => w.assigned_crew_id === params.crew_id);
  }
  if (params.mode) {
    items = items.filter((w) => w.task_mode === params.mode);
  }
  return { data: { items, total: items.length } };
}

export async function getWorkOrder(id: string) {
  await delay(200);
  const found = MOCK_WORK_ORDERS.find((w) => w.id === id);
  if (!found) {
    throw { response: { status: 404, data: { message: 'Không tìm thấy nhiệm vụ' } } };
  }
  return { data: found };
}

export async function completeFastTrack(
  workOrderId: string,
  payload: {
    after_evidence_file_id: string;
    actual_length_m: number;
    actual_width_m: number;
    actual_depth_cm: number;
    repair_method_code: string;
    notes?: string;
  },
  headers?: { 'Idempotency-Key'?: string; 'If-Match'?: string },
) {
  await delay(500);
  const found = MOCK_WORK_ORDERS.find((w) => w.id === workOrderId);
  if (!found) {
    throw { response: { status: 404, data: { message: 'Không tìm thấy nhiệm vụ' } } };
  }
  if (found.task_mode !== TaskMode.INSPECT_AND_REPAIR) {
    throw {
      response: {
        status: 422,
        data: {
          code: 'TASK_MODE_NOT_REPAIRABLE',
          message: 'Nhiệm vụ ở chế độ MEASURE_ONLY, cấm tự ý sửa tại chỗ (BR-09)',
        },
      },
    };
  }
  found.status = 'COMPLETED';
  return {
    data: {
      work_order_id: workOrderId,
      status: 'COMPLETED',
      fast_track_acknowledged: true,
      pm_review_pending: true,
    },
  };
}
