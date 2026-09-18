export enum RoleCode {
  DRONE_OPERATOR = 'DRONE_OPERATOR',
  REPAIR_CREW    = 'REPAIR_CREW',
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
  DEPRESSION_DEPTH       = 'DEPRESSION_DEPTH',
  SLAB_FAULTING_HEIGHT   = 'SLAB_FAULTING_HEIGHT',
  SHOULDER_EROSION_EXTENT = 'SHOULDER_EROSION_EXTENT',
}