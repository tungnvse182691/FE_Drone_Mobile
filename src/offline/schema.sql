-- ======================================================
-- RoadGuard Offline-first Schema (SQLite)
-- US-02, US-06, US-13: lưu bản nháp, queue upload,SHA-256
-- ======================================================

-- BẢN NHÁP: mọi thao tác hiện trường ghi local trước
CREATE TABLE IF NOT EXISTS local_draft (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL,          -- 'flight_log' | 'measurement' | 'evidence' | 'defect_report'
  payload       TEXT NOT NULL,          -- JSON blob
  created_at    TEXT NOT NULL,          -- ISO 8601
  updated_at    TEXT NOT NULL
);

-- UPLOAD QUEUE: QUEUED → UPLOADING → SERVER_CONFIRMED / INVALID
CREATE TABLE IF NOT EXISTS outbox (
  id              TEXT PRIMARY KEY,
  kind            TEXT NOT NULL,        -- 'survey_upload' | 'defect_report' | 'measurement' | 'repair_evidence'
  data_b64        TEXT NOT NULL,        -- base64 encoded payload
  checksum_sha256 TEXT NOT NULL,        -- xác thực toàn vẹn
  status          TEXT NOT NULL DEFAULT 'QUEUED',
  attempt         INTEGER DEFAULT 0,
  max_attempts    INTEGER DEFAULT 5,
  last_error      TEXT,
  created_at      TEXT NOT NULL
);

-- FILE MEDIA: video, SRT, ảnh
CREATE TABLE IF NOT EXISTS media_file (
  id                    TEXT PRIMARY KEY,
  uri_local             TEXT NOT NULL,
  kind                  TEXT NOT NULL,      -- 'video' | 'srt' | 'photo'
  size_bytes            INTEGER NOT NULL,
  checksum_sha256       TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'LOCAL',   -- LOCAL/QUEUED/UPLOADING/SERVER_CONFIRMED
  survey_data_version_id TEXT,
  defect_id             TEXT,
  repair_item_id        TEXT,
  captured_at           TEXT NOT NULL
);

-- CACHE READ-ONLY: dữ liệu server đã xác nhận, chỉ đọc
CREATE TABLE IF NOT EXISTS survey_cache (
  id              TEXT PRIMARY KEY,
  data            TEXT NOT NULL,          -- JSON SurveyDataVersion
  cached_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS defect_cache (
  id              TEXT PRIMARY KEY,
  data            TEXT NOT NULL,          -- JSON Defect
  cached_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_cache (
  id              TEXT PRIMARY KEY,
  kind            TEXT NOT NULL,          -- 'flight_log' | 'field_inspection_task' | 'repair_item'
  data            TEXT NOT NULL,          -- JSON
  cached_at       TEXT NOT NULL
);