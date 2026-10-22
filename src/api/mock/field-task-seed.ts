import { DEFECT_TYPE_CODES } from '../../constants/defect-types';
import { TaskMode } from '../../types/enums';
import type {
  CrewFieldTaskCard,
  FieldSubmissionViewFact,
  FieldTaskStatus,
} from './field-tasks';

/**
 * Dữ liệu demo cho luồng FIELD của Crew (C-02/C-04/C-07) trên tuyến ĐH.05.
 * Tên tuyến/phân đoạn lấy theo Pilot Primary Corridor; nội dung kỹ thuật bám TCVN 10380:2014.
 * Không chứa bất kỳ số tiền/định mức vật tư nào (UD-06).
 */
export interface MockFieldTaskSeed {
  card: CrewFieldTaskCard;
  projectId: string;
  defectId: string;
  surveyId: string | null;
  sourceKind: string | null;
  routeVersionId: string;
  segmentSetId: string | null;
  layoutRevisionId: string | null;
  slabId: string | null;
  purpose: string | null;
  assignmentId: string | null;
  assignedToUserId: string | null;
  firstStartOriginId: string | null;
  latestSubmissionId: string | null;
  mapPublicationId: string | null;
  crsProfileRevisionId: string | null;
  requiredMeasurementType: number;
  measurementScope: string | null;
  instructions: string | null;
  dueAt: string | null;
  initialStatus: FieldTaskStatus;
}

const PROJECT_ID = '4f6a2c1e-8b3d-4a5f-9c7e-1d2b3a4c5e6f';
const CREW_ID = 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e';
const ROUTE_VERSION_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const SEGMENT_SET_ID = '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e';
const MAP_PUBLICATION_ID = '5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b';
const CRS_PROFILE_REVISION_ID = '7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d';

export const MOCK_FIELD_TASK_SEEDS: MockFieldTaskSeed[] = [
  {
    card: {
      id: 'task-wo-01',
      wo_code: '#HH-WO-01',
      title: 'Đổ bù ổ gà sâu vỡ tấm bê tông Km02+150',
      task_mode: TaskMode.INSPECT_AND_REPAIR,
      defect_type_code: DEFECT_TYPE_CODES.POTH_DEEP,
      route_code: 'ĐH.05',
      section_name: 'Cầu Bà Lát',
      chainage: 'Km02+150',
      locality: 'Xã Bình Chánh, TP. Hồ Chí Minh',
      due_label: 'Hạn 17:00 hôm nay',
      due_urgency: 'urgent',
      distance_label: 'Cách 450m',
      defect_location: 'Làn xe cơ giới hướng Bắc',
      description:
        'Ổ gà sâu làm lộ và vỡ mặt tấm bê tông trên làn xe cơ giới, nước và bùn đọng gây trơn trượt.',
      repair_method:
        'Đục tẩy toàn bộ mảng bê tông vỡ vụn, xịt rửa sạch bụi cát, quét lớp hồ dầu xi măng liên kết trước khi đổ bê tông.',
      safety_note:
        'Đặt biển cảnh báo công trường và chóp nón giao thông cách 50m hướng đi trung tâm huyện Bình Chánh.',
      batch_size: 1,
      coordinates: { latitude: 10.783, longitude: 106.7001 },
    },
    projectId: PROJECT_ID,
    defectId: 'DEF-001',
    surveyId: '8f1e2d3c-4b5a-4968-8776-5a4b3c2d1e0f',
    sourceKind: 'DRONE_SURVEY',
    routeVersionId: ROUTE_VERSION_ID,
    segmentSetId: SEGMENT_SET_ID,
    layoutRevisionId: null,
    slabId: 'SLAB-0215-03',
    purpose: 'FIELD_INSPECTION',
    assignmentId: 'a1000000-0000-4000-8000-000000000001',
    assignedToUserId: CREW_ID,
    firstStartOriginId: null,
    latestSubmissionId: null,
    mapPublicationId: MAP_PUBLICATION_ID,
    crsProfileRevisionId: CRS_PROFILE_REVISION_ID,
    requiredMeasurementType: 1,
    measurementScope: 'FULL_TASK',
    instructions: 'Kiểm tra hiện trạng, đo kích thước ổ gà trước khi đổ bù.',
    dueAt: '2026-10-22T10:00:00Z',
    initialStatus: 'ASSIGNED',
  },
  {
    card: {
      id: 'task-wo-02',
      wo_code: '#HH-WO-02',
      title: 'Khảo sát đợt gom nứt tấm bê tông Km01+850',
      task_mode: TaskMode.MEASURE_ONLY,
      defect_type_code: DEFECT_TYPE_CODES.SLAB_CRK,
      route_code: 'ĐH.05',
      section_name: 'Vĩnh Lộc B',
      chainage: 'Km01+850',
      locality: 'Xã Bình Chánh, TP. Hồ Chí Minh',
      due_label: 'Hạn 12:00 hôm nay',
      due_urgency: 'urgent',
      distance_label: 'Cách 1.8 km',
      defect_location: 'Sát mép tấm phía tải trọng',
      description:
        'Nứt tấm bê tông lan rộng dọc mép tấm, nước đọng lại sau mưa, nguy cơ vỡ hở khi xe tải trọng đi qua.',
      repair_method:
        'Chỉ đo đạc hiện trường và gửi số đo về PM. Không tự ý sửa chữa tại chỗ trong đợt gom này.',
      safety_note:
        'Quan sát từ vai xe, đánh dấu mốc đo bằng sơn kẻ, không đứng trong vùng nước đọng.',
      batch_size: 5,
      coordinates: { latitude: 10.7875, longitude: 106.705 },
    },
    projectId: PROJECT_ID,
    defectId: 'DEF-002',
    surveyId: '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
    sourceKind: 'DRONE_SURVEY',
    routeVersionId: ROUTE_VERSION_ID,
    segmentSetId: SEGMENT_SET_ID,
    layoutRevisionId: null,
    slabId: 'SLAB-0185-07',
    purpose: 'BATCH_INSPECTION',
    assignmentId: 'a1000000-0000-4000-8000-000000000002',
    assignedToUserId: CREW_ID,
    firstStartOriginId: null,
    latestSubmissionId: null,
    mapPublicationId: MAP_PUBLICATION_ID,
    crsProfileRevisionId: CRS_PROFILE_REVISION_ID,
    requiredMeasurementType: 2,
    measurementScope: 'SAMPLE_ONLY',
    instructions: 'Chỉ đo chiều rộng và chiều dài vết nứt; không sửa tại chỗ.',
    dueAt: '2026-10-22T05:00:00Z',
    initialStatus: 'ASSIGNED',
  },
  {
    card: {
      id: 'task-wo-03',
      wo_code: '#HH-WO-03',
      title: 'Kiểm tra xói lở vai đường Km03+100',
      task_mode: TaskMode.INSPECT_AND_REPAIR,
      defect_type_code: DEFECT_TYPE_CODES.SHLD_EROS,
      route_code: 'ĐH.05',
      section_name: 'Tân Kiên',
      chainage: 'Km03+100',
      locality: 'Xã Bình Chánh, TP. Hồ Chí Minh',
      due_label: 'Hạn 16:30 hôm nay',
      due_urgency: 'normal',
      distance_label: 'Cách 3.2 km',
      defect_location: 'Vai đường phía Đông',
      description:
        'Xói lở vai đường lan rộng sau mưa lớn, đất bị cuốn trôi xuống dưới taluy âm.',
      repair_method:
        'Đo chiều dài, chiều rộng và độ sâu phần xói lở. Nếu vượt ngưỡng quy định sửa nhanh thì gửi số đo về PM để lập phương án.',
      safety_note:
        'Mang đầy đủ thiết bị bảo hộ, kiểm tra độ ổn định của bờ taluy trước khi vào hiện trường.',
      batch_size: 1,
      coordinates: { latitude: 10.7712, longitude: 106.7218 },
    },
    projectId: PROJECT_ID,
    defectId: 'DEF-003',
    surveyId: null,
    sourceKind: 'REPORTER_FEEDBACK',
    routeVersionId: ROUTE_VERSION_ID,
    segmentSetId: SEGMENT_SET_ID,
    layoutRevisionId: null,
    slabId: null,
    purpose: 'FIELD_INSPECTION',
    assignmentId: 'a1000000-0000-4000-8000-000000000003',
    assignedToUserId: CREW_ID,
    firstStartOriginId: 'b2000000-0000-4000-8000-000000000003',
    latestSubmissionId: 'sub-seed-task-wo-03-1',
    mapPublicationId: MAP_PUBLICATION_ID,
    crsProfileRevisionId: CRS_PROFILE_REVISION_ID,
    requiredMeasurementType: 1,
    measurementScope: 'FULL_TASK',
    instructions: 'Đo kích thước xói lở; nếu vượt ngưỡng sửa nhanh thì chỉ ghi nhận số đo.',
    dueAt: '2026-10-22T09:30:00Z',
    initialStatus: 'SUBMITTED',
  },
  {
    card: {
      id: 'task-wo-04',
      wo_code: '#HH-WO-04',
      title: 'Xử lý lún võng đọng nước mặt bê tông Km02+900',
      task_mode: TaskMode.INSPECT_AND_REPAIR,
      defect_type_code: DEFECT_TYPE_CODES.DEPR_POND,
      route_code: 'ĐH.05',
      section_name: 'Tân Kiên',
      chainage: 'Km02+900',
      locality: 'Xã Bình Chánh, TP. Hồ Chí Minh',
      due_label: 'Đã nghiệm thu 10/09/2026',
      due_urgency: 'normal',
      distance_label: 'Cách 200m',
      defect_location: 'Làn ngoài cùng hướng Tân Kiên',
      description: 'Lún võng đọng nước trên mặt tấm bê tông đoạn Km02+900.',
      repair_method: 'Đã hoàn thành theo phương án được PM duyệt.',
      safety_note: 'Đã thu dọn biển cảnh báo sau nghiệm thu.',
      batch_size: 1,
      coordinates: { latitude: 10.7761, longitude: 106.7127 },
      completedAt: '10/09/2026',
    },
    projectId: PROJECT_ID,
    defectId: 'DEF-005',
    surveyId: null,
    sourceKind: 'REPORTER_FEEDBACK',
    routeVersionId: ROUTE_VERSION_ID,
    segmentSetId: SEGMENT_SET_ID,
    layoutRevisionId: null,
    slabId: 'SLAB-0290-02',
    purpose: 'FIELD_REPAIR',
    assignmentId: 'a1000000-0000-4000-8000-000000000004',
    assignedToUserId: CREW_ID,
    firstStartOriginId: 'b2000000-0000-4000-8000-000000000004',
    latestSubmissionId: 'sub-seed-task-wo-04-1',
    mapPublicationId: MAP_PUBLICATION_ID,
    crsProfileRevisionId: CRS_PROFILE_REVISION_ID,
    requiredMeasurementType: 1,
    measurementScope: 'FULL_TASK',
    instructions: null,
    dueAt: null,
    initialStatus: 'COMPLETED',
  },
  {
    card: {
      id: 'task-wo-05',
      wo_code: '#HH-WO-05',
      title: 'Gia cố khe co giãn tiếp giáp tấm bê tông Km00+400',
      task_mode: TaskMode.INSPECT_AND_REPAIR,
      defect_type_code: DEFECT_TYPE_CODES.EDGE_BRK,
      route_code: 'ĐH.05',
      section_name: 'Vĩnh Lộc B',
      chainage: 'Km00+400',
      locality: 'Xã Bình Chánh, TP. Hồ Chí Minh',
      due_label: 'Đã nghiệm thu 05/09/2026',
      due_urgency: 'normal',
      distance_label: 'Cách 1.8 km',
      defect_location: 'Mép tấm phía Tây',
      description: 'Vỡ mép tấm bê tông tại khe co giãn Km00+400.',
      repair_method: 'Đã hoàn thành theo phương án được PM duyệt.',
      safety_note: 'Đã dọn biển cảnh báo sau nghiệm thu.',
      batch_size: 1,
      coordinates: { latitude: 10.7902, longitude: 106.6884 },
      completedAt: '05/09/2026',
    },
    projectId: PROJECT_ID,
    defectId: 'DEF-004',
    surveyId: null,
    sourceKind: 'DRONE_SURVEY',
    routeVersionId: ROUTE_VERSION_ID,
    segmentSetId: SEGMENT_SET_ID,
    layoutRevisionId: null,
    slabId: 'SLAB-0040-01',
    purpose: 'FIELD_REPAIR',
    assignmentId: 'a1000000-0000-4000-8000-000000000005',
    assignedToUserId: CREW_ID,
    firstStartOriginId: 'b2000000-0000-4000-8000-000000000005',
    latestSubmissionId: 'sub-seed-task-wo-05-1',
    mapPublicationId: MAP_PUBLICATION_ID,
    crsProfileRevisionId: CRS_PROFILE_REVISION_ID,
    requiredMeasurementType: 1,
    measurementScope: 'FULL_TASK',
    instructions: null,
    dueAt: null,
    initialStatus: 'COMPLETED',
  },
];

/**
 * Một lượt gửi mẫu cho C-07: hồ sơ xói lở vai đường đang chờ PM xem xét nhưng còn thiếu
 * ảnh AFTER, nên `missingReasons` khác rỗng — đúng tình huống cần gửi bổ sung.
 */
export const MOCK_FIELD_SUBMISSION_SEEDS: FieldSubmissionViewFact[] = [
  {
    id: 'sub-seed-task-wo-03-1',
    taskId: 'task-wo-03',
    rootId: 'sub-seed-task-wo-03-1',
    parentId: null,
    revision: 1,
    serverReceivedAt: '2026-10-22T02:40:00Z',
    originalReviewDueAt: '2026-10-23T02:40:00Z',
    readiness: 'INCOMPLETE',
    missingReasons: ['Thiếu ảnh AFTER sau khi xử lý'],
    contentHash: 'c3f1a90b7d24e58f6a0b1c2d3e4f5061728394a5b6c7d8e9f0a1b2c3d4e5f607',
    measurements: [
      {
        sampleId: 'ERO-01',
        type: 'CHIEU_DAI_XOI',
        value: 6.4,
        state: 'MEASURED',
        dimension: 'LENGTH',
        unit: 'm',
        instrument: 'Thước dây 50m',
        method: 'Đo dọc theo tim vai đường',
        notes: 'Đo lúc nước đã rút',
      },
      {
        sampleId: 'ERO-02',
        type: 'DO_SAU_XOI',
        value: 0.35,
        state: 'MEASURED',
        dimension: 'DEPTH',
        unit: 'm',
        instrument: 'Thước mét cứng',
        method: 'Đo tại điểm sâu nhất',
      },
    ],
    evidence: [
      {
        captureOriginId: 'e1000000-0000-4000-8000-000000000301',
        fileId: 'f1000000-0000-4000-8000-000000000301',
        purpose: 'BEFORE',
        checksumSha256: '9b1c2d3e4f5061728394a5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f90',
        mediaType: 'image/jpeg',
        capturedAt: '2026-10-22T02:31:00Z',
      },
    ],
    captureType: 'REPAIR_CLAIM',
    repaired: false,
    unrepairedReason: 'Vượt ngưỡng sửa nhanh, chờ PM duyệt phương án gia cố taluy.',
  },
];
