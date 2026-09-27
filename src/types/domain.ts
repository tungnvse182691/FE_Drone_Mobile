/// <reference types="geojson" />
import { RoleCode, SyncStatus, IntegrationStatus, DefectStatus, Severity, RepairBatchStatus, FieldInspectionTaskStatus, MeasurementType, TaskMode, FastTrackEligibility, ReporterReportStatus } from './enums';
import type { DefectTypeCode } from '../constants/defect-types';

export interface User {
  id: string;
  role_code: RoleCode;
  full_name: string;
  phone_or_email: string;
  is_reporter?: boolean;
  employee_code: string;
  must_change_password: boolean;
  token: string;
  refresh_token: string;
}

export interface FastTrackPolicyVersion {
  id: string;
  version_code: string;           // FTP-2026-V1
  max_area_m2: number;            // 1.0 m2
  max_depth_cm: number;           // 5.0 cm
  max_length_m: number;           // 2.0 m
  allowed_defect_codes: string[]; // POTH_DEEP, EDGE_BRK, ...
  effective_from: string;
  effective_to?: string;
}

export interface RepairWorkOrder {
  id: string;
  title: string;
  task_mode: TaskMode;
  assigned_crew_id: string;
  route_code: string;
  section_name: string;
  target_defect_id: string;
  defect_type_code: string;
  due_at: string;
  instructions: string;
  target_coordinates: [number, number]; // [lat, lng] WGS84
  fast_track_eligible?: FastTrackEligibility;
  status: string;
  created_at: string;
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

export interface AccessPoint {
  name: string;
  terrain_description: string;
  coordinates: [number, number]; // [lat, lng] WGS84
  safe_radius_m?: number;
}

export interface SurveyTask {
  id: string;
  code: string;
  title: string;
  project_id: string;
  route_code: string;
  section_name: string;
  location_desc: string;
  length_km: number;
  altitude_m: number;
  overlap_forward_ratio: number;
  overlap_side_ratio: number;
  format: string;
  sensor: string;
  post_processing: string;
  access_point: AccessPoint;
  assigned_pilot_id: string;
  status: string;
  due_at: string;
  instructions: string;
  pm_name: string;
  drone_serial?: string;
}

export interface FlightLog {
  id: string;
  survey_id: string;
  pilot_id: string;
  drone_serial: string;
  base_station?: string;
  departure_time: string;
  landing_time: string | null;
  duration_minutes?: number;
  weather_conditions: string;
  wind_speed_ms?: number;
  battery_start_pct?: number;
  battery_end_pct?: number;
  battery_cycles?: number;
  orthophoto_count?: number;
  checksum_sha256?: string;
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
  is_reused_from_source?: 'REPORTER' | 'DRONE'; // BR-17
  synced: SyncStatus;
}

export interface ReporterReport {
  id: string;
  tracking_code: string;
  reporter_email: string;
  reporter_phone?: string;
  route_hint?: string;
  description: string;
  photo_uris: string[];
  coordinates: [number, number];
  defect_type?: DefectTypeCode;
  status: ReporterReportStatus;
  submitted_at: string;
  rating?: number;
  feedback_notes?: string;
}

export interface TrackingTimelineEvent {
  step: ReporterReportStatus;
  label: string;
  description: string;
  occurred_at?: string;
  completed: boolean;
}