-- ======================================================
-- RoadGuard Offline-first Schema (SQLite)
-- US-02, US-06, US-13, US-33, US-40: lưu bản nháp, queue upload, SHA-256
-- Spec ref: docs/specs/09_Frontend/09_Offline_App_Sync_Spec.md
-- ======================================================

-- BẢN NHÁP: mọi thao tác hiện trường ghi local trước
-- Hỗ trợ: 'reporter_submission' (ảnh + GPS người dân), 'fast_track_completion' (ảnh AFTER crew)
CREATE TABLE IF NOT EXISTS local_draft (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL,          -- 'flight_log' | 'measurement' | 'evidence' | 'defect_report' | 'reporter_submission' | 'fast_track_completion'
  payload       TEXT NOT NULL,          -- JSON blob
  created_at    TEXT NOT NULL,          -- ISO 8601
  updated_at    TEXT NOT NULL
);

-- UPLOAD QUEUE / OUTBOX INTENT:
-- State machine: DRAFT → WAITING_DEPENDENCIES → READY → IN_FLIGHT → ACKED (hoặc CONFLICT, REJECTED, PAUSED_RETRY, INVALID)
CREATE TABLE IF NOT EXISTS outbox (
  id              TEXT PRIMARY KEY,
  kind            TEXT NOT NULL,        -- 'survey_upload' | 'defect_report' | 'measurement' | 'repair_evidence' | 'reporter_report' | 'fast_track_completion'
  data_b64        TEXT NOT NULL,        -- base64 encoded payload
  checksum_sha256 TEXT NOT NULL,        -- xác thực toàn vẹn SHA-256
  status          TEXT NOT NULL DEFAULT 'READY', -- DRAFT | WAITING_DEPENDENCIES | READY | IN_FLIGHT | ACKED | QUEUED | UPLOADING | SERVER_CONFIRMED | INVALID
  attempt         INTEGER DEFAULT 0,
  max_attempts    INTEGER DEFAULT 5,
  last_error      TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- FILE MEDIA: video, SRT, ảnh phản ánh của Reporter và ảnh AFTER của Fast Track
CREATE TABLE IF NOT EXISTS media_file (
  id                    TEXT PRIMARY KEY,
  uri_local             TEXT NOT NULL,
  kind                  TEXT NOT NULL,      -- 'video' | 'srt' | 'photo' | 'reporter_photo' | 'before_photo' | 'after_photo'
  size_bytes            INTEGER NOT NULL,
  checksum_sha256       TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'LOCAL',   -- LOCAL | QUEUED | UPLOADING | SERVER_CONFIRMED
  survey_data_version_id TEXT,
  defect_id             TEXT,
  repair_item_id        TEXT,
  work_order_id         TEXT,
  captured_at           TEXT NOT NULL
);

-- CACHE READ-ONLY: dữ liệu server đã xác nhận, chỉ đọc
CREATE TABLE IF NOT EXISTS survey_cache (
  id              TEXT PRIMARY KEY,
  data            TEXT NOT NULL,          -- JSON SurveyDataVersion / SurveyTask
  cached_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS defect_cache (
  id              TEXT PRIMARY KEY,
  data            TEXT NOT NULL,          -- JSON Defect
  cached_at       TEXT NOT NULL
);

-- TASK & POLICY CACHE: hỗ trợ 'policy' (FastTrackPolicyVersion) và 'work_order' (RepairWorkOrder)
CREATE TABLE IF NOT EXISTS task_cache (
  id              TEXT PRIMARY KEY,
  kind            TEXT NOT NULL,          -- 'policy' | 'work_order' | 'flight_log' | 'field_inspection_task' | 'repair_item'
  data            TEXT NOT NULL,          -- JSON serialized object
  cached_at       TEXT NOT NULL
);