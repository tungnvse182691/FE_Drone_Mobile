export enum RoleCode {
  DRONE_OPERATOR = 'DRONE_OPERATOR',
  REPAIR_CREW    = 'REPAIR_CREW',
  REPORTER       = 'REPORTER',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  SUPERVISOR     = 'SUPERVISOR',
}

export enum SyncStatus {
  LOCAL             = 'LOCAL',
  QUEUED            = 'QUEUED',
  UPLOADING         = 'UPLOADING',
  SERVER_CONFIRMED  = 'SERVER_CONFIRMED',
  INVALID           = 'INVALID',
}

export enum IntegrationStatus {
  INTACT    = 'INTACT',
  CORRUPTED = 'CORRUPTED',
}

export enum DefectStatus {
  OPEN     = 'OPEN',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  RESOLVED = 'RESOLVED',
}

export enum Severity {
  LOW      = 'LOW',
  MEDIUM   = 'MEDIUM',
  HIGH     = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum RepairBatchStatus {
  DRAFT                  = 'DRAFT',
  PENDING_APPROVAL       = 'PENDING_APPROVAL',
  REVISION_REQUIRED      = 'REVISION_REQUIRED',
  APPROVED               = 'APPROVED',
  ASSIGNED               = 'ASSIGNED',
  IN_PROGRESS            = 'IN_PROGRESS',
  PENDING_INSPECTION     = 'PENDING_INSPECTION',
  REVISION_REQUIRED_WORK = 'REVISION_REQUIRED_WORK',
  COMPLETED              = 'COMPLETED',
}

export enum FieldInspectionTaskStatus {
  NEW_ASSIGNED          = 'NEW_ASSIGNED',
  ACCEPTED              = 'ACCEPTED',
  REJECTED              = 'REJECTED',
  IN_PROGRESS           = 'IN_PROGRESS',
  SUPPLEMENT_REQUIRED   = 'SUPPLEMENT_REQUIRED',
  SUBMITTED             = 'SUBMITTED',
  COMPLETED             = 'COMPLETED',
}

export enum MeasurementType {
  DIMENSIONS_3D         = 'DIMENSIONS_3D',
  DEPRESSION_DEPTH       = 'DEPRESSION_DEPTH',
  SLAB_FAULTING_HEIGHT   = 'SLAB_FAULTING_HEIGHT',
  SHOULDER_EROSION_EXTENT = 'SHOULDER_EROSION_EXTENT',
}

export enum TaskMode {
  INSPECT_AND_REPAIR = 'INSPECT_AND_REPAIR', // Đo và sửa nhanh nếu đạt policy
  MEASURE_ONLY       = 'MEASURE_ONLY',       // Chỉ đo đợt gom, cấm tự ý sửa (BR-09)
  INSPECT_ONLY       = 'INSPECT_ONLY',       // Chỉ kiểm tra hiện trạng, không đo đạc, không sửa
}

export enum FastTrackEligibility {
  ELIGIBLE        = 'ELIGIBLE',        // Đạt policy, được sửa ngay
  EXCEEDED_POLICY = 'EXCEEDED_POLICY', // Vượt kích thước, chuyển PM lập phương án
  LOCKED_BY_PM    = 'LOCKED_BY_PM',    // PM khóa quyền tự sửa
}

export enum LocalState {
  DRAFT                = 'DRAFT',
  WAITING_DEPENDENCIES = 'WAITING_DEPENDENCIES',
  READY                = 'READY',
  IN_FLIGHT            = 'IN_FLIGHT',
  UNKNOWN_OUTCOME      = 'UNKNOWN_OUTCOME',
  AUTH_REQUIRED        = 'AUTH_REQUIRED',
  PAUSED_RETRY         = 'PAUSED_RETRY',
  CONFLICT             = 'CONFLICT',
  REJECTED             = 'REJECTED',
  BLOCKED_CONTRACT     = 'BLOCKED_CONTRACT',
  ACKED                = 'ACKED',
}

export enum ReporterReportStatus {
  SUBMITTED  = 'SUBMITTED',  // Đã gửi
  RECEIVED   = 'RECEIVED',   // Đã tiếp nhận
  INSPECTING = 'INSPECTING', // Đang khảo sát/đo đạc
  REPAIRING  = 'REPAIRING',  // Đang sửa chữa
  COMPLETED  = 'COMPLETED',  // Đã hoàn thành nghiệm thu
  REJECTED   = 'REJECTED',   // Không hợp lệ
}