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

-- ===========================================================================
-- SYNC STATE MACHINE (09_Frontend/09_Offline_App_Sync_Spec.md §5)
-- DRAFT → WAITING_DEPENDENCIES → READY → IN_FLIGHT → ACKED
; ngoại lệ: UNKNOWN_OUTCOME | AUTH_REQUIRED | PAUSED_RETRY | CONFLICT | REJECTED
-- ===========================================================================

-- PARTITION THEO ACCOUNT/SESSION: mỗi account một partition riêng; chỉ mở queue khi login.
-- Không xóa evidence/queue khi session hết hạn — chỉ khoá partition và yêu cầu login lại.
CREATE TABLE IF NOT EXISTS sync_partitions (
  partition_id     TEXT PRIMARY KEY,
  account_id       TEXT NOT NULL,
  role_code        TEXT NOT NULL,
  lease_owner      TEXT,
  lease_expires_at TEXT,
  last_sync_at     TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);

-- BẢN NHÁP/PENDING theo partition: mọi thao tác hiện trường durable trước khi gửi.
CREATE TABLE IF NOT EXISTS offline_pending (
  id           TEXT PRIMARY KEY,
  partition_id TEXT NOT NULL,
  kind         TEXT NOT NULL,       -- 'flight_log' | 'measurement' | 'evidence' | 'defect_report' | 'reporter_report' | 'fast_track_completion'
  payload      TEXT NOT NULL,       -- JSON blob
  local_state  TEXT NOT NULL DEFAULT 'DRAFT',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_offline_pending_partition
  ON offline_pending (partition_id, local_state, created_at ASC);

-- OUTBOX DURABLE: intent chưa materialize thành wire command.
-- data_b64 = base64 chuẩn của UTF-8 payload; checksum_sha256 bám theo payload gốc (không phải base64).
CREATE TABLE IF NOT EXISTS offline_outbox (
  id              TEXT PRIMARY KEY,
  partition_id    TEXT NOT NULL,
  kind            TEXT NOT NULL,
  payload_b64     TEXT NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  task_id         TEXT,
  expected_version TEXT,
  local_state     TEXT NOT NULL DEFAULT 'READY',
  attempt         INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT,
  last_error      TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_offline_outbox_dispatch
  ON offline_outbox (partition_id, local_state, next_attempt_at ASC, created_at ASC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_offline_outbox_idempotency
  ON offline_outbox (idempotency_key);

-- MEDIA LEDGER theo vòng đời 09:
-- LOCAL_SAVING → LOCAL_READY → SESSION_CREATED → UPLOADING → COMPLETE_REQUESTED → VERIFYING → VERIFIED
-- (kèm PAUSED / FAILED để retry giữ nguyên hash)
CREATE TABLE IF NOT EXISTS media_assets (
  id              TEXT PRIMARY KEY,
  partition_id    TEXT NOT NULL,
  uri_local       TEXT NOT NULL,
  kind            TEXT NOT NULL,       -- 'video' | 'srt' | 'photo' | 'before_photo' | 'after_photo' | 'reporter_photo'
  size_bytes      INTEGER NOT NULL,
  bytes_uploaded  INTEGER NOT NULL DEFAULT 0,
  checksum_sha256 TEXT NOT NULL,
  media_state     TEXT NOT NULL DEFAULT 'LOCAL_SAVING',
  session_id      TEXT,
  captured_at     TEXT NOT NULL,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_assets_state
  ON media_assets (partition_id, media_state);

-- REGISTRY IDEMPOTENCY: chống gửi lại cùng key với payload khác (server trả 409 IDEMPOTENCY_KEY_REUSED).
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key            TEXT PRIMARY KEY,
  operation_id   TEXT NOT NULL,
  request_hash   TEXT NOT NULL,
  response_status INTEGER,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

-- RECEIPT THEO TỪNG OPERATION (bắt buộc): ACK từng operationId, không ACK cả batch.
-- Batch không atomic toàn bộ: A APPLIED, B CONFLICT, C REJECTED là kết quả hợp lệ cùng lúc.
CREATE TABLE IF NOT EXISTS wire_command (
  operation_id     TEXT PRIMARY KEY,
  partition_id     TEXT NOT NULL,
  envelope_key     TEXT NOT NULL,
  kind             TEXT NOT NULL,
  task_id          TEXT,
  expected_version TEXT,
  request_json     TEXT NOT NULL,
  local_state      TEXT NOT NULL DEFAULT 'READY',
  resource_id      TEXT,
  resource_version TEXT,
  error_code       TEXT,
  error_message    TEXT,
  trace_id         TEXT,
  acked_at         TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wire_command_partition
  ON wire_command (partition_id, local_state, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_wire_command_envelope
  ON wire_command (envelope_key);