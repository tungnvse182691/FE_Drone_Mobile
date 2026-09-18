/// <reference types="geojson" />
import { RoleCode, SyncStatus, IntegrationStatus, DefectStatus, Severity, RepairBatchStatus, FieldInspectionTaskStatus, MeasurementType } from './enums';

export interface User {
  id: string;
  role_code: RoleCode;
  full_name: string;
  email: string;
  employee_code: string;
  must_change_password: boolean;
  project_ids: string[];
  token: string;
  refresh_token: string;
}

export interface SurveyDataVersion {
  id: string;
  survey_id: string;
  version_no: number;
  status: SyncStatus;
  integration_status: IntegrationStatus;
  checksum_sha256: string | null;
  files: SurveyFile[];
  server_confirmed_at: string | null;
}

export interface SurveyFile {
  video_id: string;
  srt_id: string | null;
  size_bytes: number;
}

export interface FlightLog {
  id: string;
  survey_id: string;
  pilot_id: string;
  drone_serial: string;
  departure_time: string;
  landing_time: string | null;
  weather_conditions: string;
  gps_log_path: string | null;
  status: SyncStatus;
}

export interface FileRecord {
  id: string;
  uri_local: string;
  checksum_sha256: string;
  status: SyncStatus;
  size_bytes: number;
}

export interface Defect {
  id: string;
  project_id: string;
  road_section_version_id: string;
  defect_type_code: string;
  cause_category_code?: string;
  severity: Severity;
  status: DefectStatus;
  geometry: GeoJSON.Geometry;
  reported_at: string;
  ai_detection_id?: string;
  notes?: string;
}

export interface FieldInspectionTask {
  id: string;
  defect_id: string;
  assigned_to: string;
  status: FieldInspectionTaskStatus;
  required_measurement_type: MeasurementType;
  due_at: string;
  instructions?: string;
}

export interface GroundTruthMeasurement {
  id: string;
  session_id: string;
  task_id: string;
  defect_id: string;
  measurement_type: MeasurementType;
  value: number;
  unit: string;
  instrument_name: string;
  measurement_method: string;
  measured_by: string;
  measured_at: string;
  location: { type: 'Point'; coordinates: [number, number] };
  evidence_file_id?: string;
  notes?: string;
}

export interface RepairItem {
  id: string;
  defect_id: string;
  estimated_cost: number;
  actual_cost?: number;
  status: string;
  description?: string;
}

export interface RepairBatchVersion {
  id: string;
  batch_id: string;
  version_no: number;
  status: RepairBatchStatus;
  estimated_total_cost: number;
  items: RepairItem[];
  submitted_at?: string;
  approved_at?: string;
  rejected_reason?: string;
}

export interface RepairEvidence {
  id: string;
  repair_item_id: string;
  kind: 'BEFORE' | 'AFTER';
  file_id: string;
  captured_at: string;
  synced: SyncStatus;
}