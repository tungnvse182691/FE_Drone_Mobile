# RoadGuard - Entity Relationship Diagram v1

> Phạm vi bàn giao BE — 18/09/2026: đợt hiện tại phát triển backend ASP.NET Core; Android/Web thuộc FE, AI thật và thu thập số đo thực địa là tích hợp bên ngoài ở giai đoạn sau. Backend vẫn triển khai đầy đủ workflow bắt buộc, adapter AI giả lập xác định và chức năng Research Validation nhập/ghép/tính sai số/xuất báo cáo bằng dữ liệu kiểm thử hoặc dữ liệu ngoài đã có. Nghiệm thu phần mềm BE không tuyên bố độ chính xác AI hay kết quả thực nghiệm từ dữ liệu giả. Các yêu cầu sản phẩm/nghiên cứu đầy đủ bên dưới vẫn được giữ để truy vết. Xem [ADR 003](../adr/003-backend-delivery-and-ai-boundary.md).

ERD logic nay duoc tong hop tu:

- `RoadGuard_Data_Dictionary_v1.md`;
- `RoadGuard_Domain_Model_v1.md`;
- `RoadGuard_Entity_List_v2.md`.

Data Dictionary la nguon chinh cho ten cot, khoa va nullability. Domain Model va Entity List duoc dung de xac dinh ownership, versioning va cac invariant lien aggregate.

## 1. Quy uoc

| Ky hieu | Y nghia |
|---|---|
| `PK` | Khoa chinh |
| `FK` | Khoa ngoai |
| `UK` | Khoa duy nhat hoac thanh phan cua khoa duy nhat |
| `||` | Dung mot |
| `o|` | Khong hoac mot |
| `|{` | Mot hoac nhieu |
| `o{` | Khong hoac nhieu |

Ghi chu:

- Ten bang/cot trong ERD dung `UPPER_SNAKE_CASE` de Mermaid hien thi on dinh; ten logic tuong ung la PascalCase/snake_case trong Data Dictionary.
- ERD chi hien thi khoa va cac thuoc tinh nghiep vu quan trong. Danh sach cot day du, kieu SQL Server va enum nam trong Data Dictionary.
- `AUDIT_LOG.entity_id` va `NOTIFICATION.source_entity_id` la tham chieu da hinh co chu dich, khong phai FK vat ly.
- `EVIDENCE` dung cac FK nullable rieng va bat buoc dung mot FK dich co gia tri.

## 2. Luong nghiep vu cot loi

```mermaid
erDiagram
    PROJECT ||--o{ ROAD_SECTION : owns
    ROAD_SECTION ||--|{ ROAD_SECTION_VERSION : versions
    PROJECT ||--o{ SURVEY_REQUEST : receives
    SURVEY_REQUEST o|--o{ SURVEY : initiates
    ROAD_SECTION_VERSION ||--o{ SURVEY : anchors
    SURVEY ||--o{ FLIGHT : contains
    SURVEY ||--o{ SURVEY_FILE : contains
    SURVEY ||--o{ SURVEY_DATA_VERSION : versions
    SURVEY_DATA_VERSION ||--o{ PROCESSING_BLOCK : partitions
    PROCESSING_BLOCK ||--o{ PROCESSING_JOB : runs
    PROCESSING_JOB ||--o{ AI_DETECTION : produces
    AI_DETECTION o|--o| DEFECT : originates
    DEFECT ||--o{ FIELD_INSPECTION_TASK : requires
    FIELD_INSPECTION_TASK o|--o{ FIELD_INSPECTION_SESSION : collects
    FIELD_INSPECTION_SESSION ||--o{ GROUND_TRUTH_MEASUREMENT : contains
    DEFECT ||--o{ GROUND_TRUTH_MEASUREMENT : verifies
    DEFECT ||--o{ REPAIR_ITEM : selected_for
    REPAIR_BATCH ||--o{ REPAIR_BATCH_VERSION : versions
    REPAIR_BATCH_VERSION ||--o{ REPAIR_ITEM : contains
    REPAIR_ITEM ||--o{ REPAIR_PROGRESS : tracks
    REPAIR_ITEM ||--o{ REPAIR_EVIDENCE : proves
    REPAIR_ITEM ||--o{ REPAIR_INSPECTION_RESULT : inspects

    PROJECT {
        uuid id PK
        string project_code UK
        string status
    }
    ROAD_SECTION {
        uuid id PK
        uuid project_id FK
        uuid current_version_id FK
        string code UK
    }
    ROAD_SECTION_VERSION {
        uuid id PK
        uuid road_section_id FK
        int version_no UK
        spatial geometry
    }
    SURVEY_REQUEST {
        uuid id PK
        uuid project_id FK
        uuid road_section_id FK
        uuid survey_plan_id FK
        string status
    }
    SURVEY {
        uuid id PK
        uuid survey_request_id FK
        uuid project_id FK
        uuid road_section_version_id FK
        string survey_type
        boolean is_baseline_confirmed
        string status
    }
    FLIGHT {
        uuid id PK
        uuid survey_id FK
        uuid drone_device_id FK
        uuid operator_user_id FK
        string flight_no UK
    }
    SURVEY_FILE {
        uuid id PK
        uuid survey_id FK
        uuid flight_id FK
        uuid file_id FK
        string file_type
        string sync_status
    }
    SURVEY_DATA_VERSION {
        uuid id PK
        uuid survey_id FK
        int version_no UK
        string status
        string integrity_status
    }
    PROCESSING_BLOCK {
        uuid id PK
        uuid survey_data_version_id FK
        int block_no UK
    }
    PROCESSING_JOB {
        uuid id PK
        uuid processing_block_id FK
        uuid model_version_id FK
        string status
    }
    AI_DETECTION {
        uuid id PK
        uuid processing_job_id FK
        uuid model_version_id FK
        uuid road_section_version_id FK
        string defect_type_code FK
        decimal confidence
    }
    DEFECT {
        uuid id PK
        uuid project_id FK
        uuid road_section_version_id FK
        uuid source_ai_detection_id FK
        string defect_type_code FK
        string status
        string severity
    }
    FIELD_INSPECTION_TASK {
        uuid id PK
        uuid project_id FK
        uuid defect_id FK
        uuid survey_id FK
        uuid road_section_version_id FK
        string status
        string review_decision
    }
    FIELD_INSPECTION_SESSION {
        uuid id PK
        uuid field_inspection_task_id FK
        uuid project_id FK
        uuid road_section_version_id FK
        uuid survey_id FK
        string purpose
        string status
    }
    GROUND_TRUTH_MEASUREMENT {
        uuid id PK
        uuid field_inspection_session_id FK
        uuid road_section_version_id FK
        uuid survey_id FK
        uuid defect_id FK
        string sample_id UK
        decimal value
        string unit
    }
    REPAIR_BATCH {
        uuid id PK
        uuid project_id FK
        uuid current_version_id FK
        string status
    }
    REPAIR_BATCH_VERSION {
        uuid id PK
        uuid repair_batch_id FK
        int version_no UK
        decimal estimated_total_cost
        string status
    }
    REPAIR_ITEM {
        uuid id PK
        uuid repair_batch_version_id FK
        uuid defect_id FK
        decimal estimated_cost
        string status
    }
    REPAIR_PROGRESS {
        uuid id PK
        uuid repair_item_id FK
        decimal actual_cost
        string status
    }
    REPAIR_EVIDENCE {
        uuid id PK
        uuid repair_item_id FK
        uuid file_id FK
        string evidence_stage
    }
    REPAIR_INSPECTION_RESULT {
        uuid id PK
        uuid repair_item_id FK
        string result
    }
}
```

## 3. Auth, Access va Project

```mermaid
erDiagram
    ROLE ||--o{ USER : grants
    USER ||--o{ SESSION : opens
    SESSION ||--o{ REFRESH_TOKEN : issues
    USER ||--o{ PASSWORD_RESET_LOG : target
    USER o|--o{ PASSWORD_RESET_LOG : performs
    USER ||--o{ ACCOUNT_STATUS_CHANGE_LOG : target
    USER o|--o{ ACCOUNT_STATUS_CHANGE_LOG : changes
    USER ||--o{ NOTIFICATION : receives
    PROJECT ||--o{ PROJECT_MEMBER : has
    USER ||--o{ PROJECT_MEMBER : joins
    ROLE ||--o{ PROJECT_MEMBER : acts_as
    PROJECT ||--o{ ROAD_SECTION : owns
    ROAD_SECTION ||--|{ ROAD_SECTION_VERSION : versions
    ROAD_SECTION o|--|| ROAD_SECTION_VERSION : current_version
    PROJECT ||--o{ HANDOVER_DOCUMENT : has
    USER o|--o{ HANDOVER_DOCUMENT : accepts
    FILE o|--o{ HANDOVER_DOCUMENT : stores
    PROJECT ||--o{ WARRANTY : has
    ROAD_SECTION o|--o{ WARRANTY : scopes
    HANDOVER_DOCUMENT o|--o{ WARRANTY : supports
    FILE o|--o{ WARRANTY : sources

    ROLE {
        string code PK
        string name
        boolean is_active
    }
    USER {
        uuid id PK
        string username UK
        string email UK
        string role_code FK
        string status
        boolean must_change_password
    }
    SESSION {
        uuid id PK
        uuid user_id FK
        datetime issued_at
        json device_metadata_json
        datetime expires_at
        datetime revoked_at
    }
    REFRESH_TOKEN {
        uuid id PK
        uuid session_id FK
        string token_hash UK
        datetime expires_at
        datetime revoked_at
    }
    PASSWORD_RESET_LOG {
        uuid id PK
        uuid target_user_id FK
        uuid performed_by_user_id FK
        datetime occurred_at
        string result
    }
    ACCOUNT_STATUS_CHANGE_LOG {
        uuid id PK
        uuid target_user_id FK
        uuid changed_by_user_id FK
        string from_status
        string to_status
        datetime occurred_at
    }
    NOTIFICATION {
        uuid id PK
        uuid recipient_user_id FK
        string source_entity_type
        uuid source_entity_id
        string event_type
        datetime read_at
    }
    PROJECT {
        uuid id PK
        string project_code UK
        string name
        string status
    }
    PROJECT_MEMBER {
        uuid id PK
        uuid project_id FK
        uuid user_id FK
        string role_code FK
        boolean is_primary
        date valid_from
        date valid_to
        string status
    }
    ROAD_SECTION {
        uuid id PK
        uuid project_id FK
        uuid current_version_id FK
        string code UK
        string name
    }
    ROAD_SECTION_VERSION {
        uuid id PK
        uuid road_section_id FK
        int version_no UK
        spatial geometry
        datetime effective_from
    }
    HANDOVER_DOCUMENT {
        uuid id PK
        uuid project_id FK
        uuid accepted_by_user_id FK
        uuid file_id FK
        string document_no UK
        date handover_date
    }
    WARRANTY {
        uuid id PK
        uuid project_id FK
        uuid road_section_id FK
        uuid handover_document_id FK
        uuid source_document_id FK
        date warranty_start_date
        date warranty_end_date
        decimal retained_value
        string scope
        string status
    }
    FILE {
        uuid id PK
    }
}
```

## 4. Survey va Quality

```mermaid
erDiagram
    PROJECT ||--o{ SURVEY_PLAN : plans
    ROAD_SECTION ||--o{ SURVEY_PLAN : scopes
    SURVEY_PLAN ||--o{ SURVEY_PLAN_POSTPONEMENT : postpones
    PROJECT ||--o{ SURVEY_REQUEST : receives
    ROAD_SECTION ||--o{ SURVEY_REQUEST : scopes
    SURVEY_PLAN o|--o{ SURVEY_REQUEST : originates
    USER ||--o{ SURVEY_REQUEST : requests
    SURVEY_REQUEST ||--o{ SURVEY_ASSIGNMENT : assigns
    USER ||--o{ SURVEY_ASSIGNMENT : operates
    USER ||--o{ SURVEY_ASSIGNMENT : assigns
    SURVEY_REQUEST o|--o{ SURVEY : initiates
    PROJECT ||--o{ SURVEY : owns
    ROAD_SECTION_VERSION ||--o{ SURVEY : anchors
    USER o|--o{ SURVEY : confirms_baseline
    SURVEY ||--o{ FLIGHT : contains
    DRONE_DEVICE o|--o{ FLIGHT : used_by
    USER ||--o{ FLIGHT : operates
    SURVEY ||--o{ SURVEY_FILE : contains
    FLIGHT o|--o{ SURVEY_FILE : captures
    FILE ||--o{ SURVEY_FILE : stores
    SURVEY ||--o{ SURVEY_DATA_VERSION : versions
    SURVEY_FILE o|--o{ QUALITY_CHECK : file_checks
    SURVEY_DATA_VERSION o|--o{ QUALITY_CHECK : dataset_checks
    USER o|--o{ QUALITY_CHECK : initiates
    SURVEY ||--o{ SUPPLEMENTARY_SURVEY_REQUEST : contextualizes
    SURVEY_REQUEST o|--o{ SUPPLEMENTARY_SURVEY_REQUEST : traces_to
    USER ||--o{ SUPPLEMENTARY_SURVEY_REQUEST : requests
    USER o|--o{ SUPPLEMENTARY_SURVEY_REQUEST : approves

    SURVEY_PLAN {
        uuid id PK
        uuid project_id FK
        uuid road_section_id FK
        datetime planned_start_at
        datetime planned_end_at
        string survey_type
        string status
    }
    SURVEY_PLAN_POSTPONEMENT {
        uuid id PK
        uuid survey_plan_id FK
        datetime postponed_at
        datetime new_planned_start_at
        string reason
    }
    SURVEY_REQUEST {
        uuid id PK
        uuid project_id FK
        uuid road_section_id FK
        uuid survey_plan_id FK
        uuid requested_by_user_id FK
        string survey_type
        string status
    }
    SURVEY_ASSIGNMENT {
        uuid id PK
        uuid survey_request_id FK
        uuid operator_user_id FK
        uuid assigned_by_user_id FK
        datetime assigned_at
        datetime ended_at
    }
    SURVEY {
        uuid id PK
        uuid survey_request_id FK
        uuid project_id FK
        uuid road_section_version_id FK
        uuid baseline_confirmed_by_user_id FK
        string survey_type
        boolean is_baseline_confirmed
        string status
    }
    FLIGHT {
        uuid id PK
        uuid survey_id FK
        uuid drone_device_id FK
        uuid operator_user_id FK
        string flight_no UK
        datetime started_at
        datetime ended_at
    }
    DRONE_DEVICE {
        uuid id PK
        string serial_no UK
        string model
        string status
    }
    SURVEY_FILE {
        uuid id PK
        uuid survey_id FK
        uuid flight_id FK
        uuid file_id FK
        string file_type
        string sync_status
        string checksum
    }
    SURVEY_DATA_VERSION {
        uuid id PK
        uuid survey_id FK
        int version_no UK
        string status
        string integrity_status
        string confirmed_by
    }
    QUALITY_CHECK {
        uuid id PK
        uuid survey_file_id FK
        uuid survey_data_version_id FK
        uuid initiated_by_user_id FK
        string scope
        string execution_stage
        string check_type
        string status
        string checked_by
    }
    SUPPLEMENTARY_SURVEY_REQUEST {
        uuid id PK
        uuid survey_id FK
        uuid survey_request_id FK
        uuid requested_by_user_id FK
        uuid approved_by_user_id FK
        int round_no UK
        string status
    }
    PROJECT {
        uuid id PK
    }
    ROAD_SECTION {
        uuid id PK
    }
    ROAD_SECTION_VERSION {
        uuid id PK
    }
    USER {
        uuid id PK
    }
    FILE {
        uuid id PK
    }
}
```

Rang buoc `QUALITY_CHECK`: dung mot trong `survey_file_id` va `survey_data_version_id` phai co gia tri, tuy theo `scope`. Chi `SERVER_VALIDATION` do `BACKEND` thuc hien moi co quyen xac nhan `SURVEY_DATA_VERSION`.

## 5. Do thuc dia va Research Validation

```mermaid
erDiagram
    PROJECT ||--o{ FIELD_INSPECTION_TASK : owns
    DEFECT ||--o{ FIELD_INSPECTION_TASK : requires
    SURVEY ||--o{ FIELD_INSPECTION_TASK : originates
    ROAD_SECTION_VERSION ||--o{ FIELD_INSPECTION_TASK : anchors
    USER ||--o{ FIELD_INSPECTION_TASK : assigns
    USER o|--o{ FIELD_INSPECTION_TASK : reviews
    FIELD_INSPECTION_TASK ||--o{ FIELD_INSPECTION_ASSIGNMENT : assignments
    USER ||--o{ FIELD_INSPECTION_ASSIGNMENT : receives
    USER ||--o{ FIELD_INSPECTION_ASSIGNMENT : assigns
    FIELD_INSPECTION_TASK o|--o{ FIELD_INSPECTION_SESSION : sessions
    PROJECT ||--o{ FIELD_INSPECTION_SESSION : owns
    ROAD_SECTION_VERSION ||--o{ FIELD_INSPECTION_SESSION : anchors
    SURVEY o|--o{ FIELD_INSPECTION_SESSION : contextualizes
    USER o|--o{ FIELD_INSPECTION_SESSION : inspects
    FILE o|--o{ FIELD_INSPECTION_SESSION : evidences
    FIELD_INSPECTION_SESSION ||--o{ GROUND_TRUTH_MEASUREMENT : contains
    ROAD_SECTION_VERSION ||--o{ GROUND_TRUTH_MEASUREMENT : anchors
    SURVEY o|--o{ GROUND_TRUTH_MEASUREMENT : compares
    DEFECT o|--o{ GROUND_TRUTH_MEASUREMENT : verifies
    FILE o|--o{ GROUND_TRUTH_MEASUREMENT : evidences
    SURVEY_DATA_VERSION ||--o{ DERIVED_MEASUREMENT : derives
    ROAD_SECTION_VERSION ||--o{ DERIVED_MEASUREMENT : anchors
    DEFECT o|--o{ DERIVED_MEASUREMENT : measures
    MEASUREMENT_VALIDATION_RUN ||--o{ MEASUREMENT_VALIDATION_SAMPLE : contains
    GROUND_TRUTH_MEASUREMENT ||--o{ MEASUREMENT_VALIDATION_SAMPLE : pairs
    DERIVED_MEASUREMENT ||--o{ MEASUREMENT_VALIDATION_SAMPLE : pairs

    FIELD_INSPECTION_TASK {
        uuid id PK
        string task_code UK
        uuid project_id FK
        uuid defect_id FK
        uuid survey_id FK
        uuid road_section_version_id FK
        string required_measurement_type
        datetime due_at
        string status
        string review_decision
    }
    FIELD_INSPECTION_ASSIGNMENT {
        uuid id PK
        uuid field_inspection_task_id FK
        uuid assigned_to_user_id FK
        uuid assigned_by_user_id FK
        datetime assigned_at
        datetime ended_at
        string status
    }
    FIELD_INSPECTION_SESSION {
        uuid id PK
        uuid field_inspection_task_id FK
        uuid project_id FK
        uuid road_section_version_id FK
        uuid survey_id FK
        uuid inspector_user_id FK
        uuid evidence_file_id FK
        string session_code UK
        string purpose
        string status
    }
    GROUND_TRUTH_MEASUREMENT {
        uuid id PK
        uuid field_inspection_session_id FK
        uuid road_section_version_id FK
        uuid survey_id FK
        uuid defect_id FK
        uuid evidence_file_id FK
        string sample_id UK
        string measurement_type
        decimal value
        string unit
        spatial location
    }
    DERIVED_MEASUREMENT {
        uuid id PK
        uuid survey_data_version_id FK
        uuid road_section_version_id FK
        uuid defect_id FK
        string sample_id
        string measurement_type
        decimal value
        string unit
        string status
    }
    MEASUREMENT_VALIDATION_RUN {
        uuid id PK
        string run_code UK
        string measurement_type
        int sample_count
        decimal bias
        decimal mae
        decimal rmse
        decimal uncertainty_value
        string status
    }
    MEASUREMENT_VALIDATION_SAMPLE {
        uuid id PK
        uuid validation_run_id FK
        uuid ground_truth_measurement_id FK
        uuid derived_measurement_id FK
        decimal signed_error
        decimal absolute_error
        string inclusion_status
    }
    PROJECT {
        uuid id PK
    }
    DEFECT {
        uuid id PK
    }
    SURVEY {
        uuid id PK
    }
    SURVEY_DATA_VERSION {
        uuid id PK
    }
    ROAD_SECTION_VERSION {
        uuid id PK
    }
    USER {
        uuid id PK
    }
    FILE {
        uuid id PK
    }
}
```

Voi `purpose = DEFECT_VERIFICATION`, `field_inspection_task_id`, `survey_id` va lien ket `defect_id` tren phep do la bat buoc. Voi `purpose = RESEARCH_VALIDATION`, `field_inspection_task_id` phai rong va ket qua khong tu dong thay doi `DEFECT` hoac `WARRANTY`.

## 6. Processing, AI va Defect

```mermaid
erDiagram
    SURVEY_DATA_VERSION ||--o{ PROCESSING_BLOCK : partitions
    PROCESSING_BLOCK ||--o{ PROCESSING_JOB : runs
    AI_MODEL_VERSION ||--o{ PROCESSING_JOB : executes
    USER o|--o{ AI_MODEL_VERSION : releases
    PROCESSING_JOB ||--o{ PROCESSING_ATTEMPT : retries
    PROCESSING_JOB ||--o{ AI_DETECTION : produces
    AI_MODEL_VERSION ||--o{ AI_DETECTION : stamps
    ROAD_SECTION_VERSION o|--o{ AI_DETECTION : locates
    DEFECT_TYPE o|--o{ AI_DETECTION : predicts
    PROJECT ||--o{ DEFECT : owns
    ROAD_SECTION_VERSION ||--o{ DEFECT : locates
    AI_DETECTION o|--o| DEFECT : originates
    DEFECT_TYPE ||--o{ DEFECT : classifies
    CAUSE_CATEGORY o|--o{ DEFECT : explains
    DEFECT o|--o{ DEFECT_VERIFICATION_LOG : target
    AI_DETECTION o|--o{ DEFECT_VERIFICATION_LOG : target
    SEVERITY_RULE_VERSION o|--o{ DEFECT_VERIFICATION_LOG : applies
    FIELD_INSPECTION_TASK o|--o{ DEFECT_VERIFICATION_LOG : supports
    USER ||--o{ DEFECT_VERIFICATION_LOG : verifies
    DEFECT ||--o{ DEFECT_MERGE_DECISION : source
    DEFECT o|--o{ DEFECT_MERGE_DECISION : target
    USER ||--o{ DEFECT_MERGE_DECISION : decides
    DEFECT ||--o{ DEFECT_MATCH : side_a
    DEFECT ||--o{ DEFECT_MATCH : side_b
    USER o|--o{ DEFECT_MATCH : reviews
    DEFECT ||--o{ TRAINING_LABEL_APPROVAL : labels
    USER o|--o{ TRAINING_LABEL_APPROVAL : approves
    USER ||--o{ TRAINING_DATASET_EXPORT : requests
    FILE o|--o{ TRAINING_DATASET_EXPORT : stores

    PROCESSING_BLOCK {
        uuid id PK
        uuid survey_data_version_id FK
        int block_no UK
        json range_metadata
    }
    PROCESSING_JOB {
        uuid id PK
        uuid processing_block_id FK
        uuid model_version_id FK
        string status
        string error_code
    }
    PROCESSING_ATTEMPT {
        uuid id PK
        uuid processing_job_id FK
        int attempt_no UK
        datetime started_at
        datetime ended_at
        string error_type
    }
    AI_MODEL_VERSION {
        uuid id PK
        string version_label UK
        string model_name
        string artifact_uri
        string status
    }
    AI_DETECTION {
        uuid id PK
        uuid processing_job_id FK
        uuid model_version_id FK
        uuid road_section_version_id FK
        string defect_type_code FK
        decimal confidence
        spatial geometry
    }
    DEFECT {
        uuid id PK
        uuid project_id FK
        uuid road_section_version_id FK
        uuid source_ai_detection_id FK
        string defect_type_code FK
        string cause_category_code FK
        string severity
        string status
        spatial geometry
    }
    DEFECT_VERIFICATION_LOG {
        uuid id PK
        uuid defect_id FK
        uuid ai_detection_id FK
        uuid severity_rule_version_id FK
        uuid field_inspection_task_id FK
        uuid verified_by_user_id FK
        string action
    }
    DEFECT_MERGE_DECISION {
        uuid id PK
        uuid source_defect_id FK
        uuid target_defect_id FK
        uuid decided_by_user_id FK
        string decision
    }
    DEFECT_MATCH {
        uuid id PK
        uuid defect_id_a FK
        uuid defect_id_b FK
        uuid reviewed_by_user_id FK
        decimal match_confidence
        string match_method
    }
    DEFECT_TYPE {
        string code PK
        string name
        boolean is_active
    }
    CAUSE_CATEGORY {
        string code PK
        string name
        boolean is_active
    }
    SEVERITY_RULE_VERSION {
        uuid id PK
        string standard_code
        string road_type_code
        int version_no UK
        date effective_from
        date effective_to
    }
    TRAINING_LABEL_APPROVAL {
        uuid id PK
        uuid defect_id FK
        uuid approved_by_user_id FK
        string status
    }
    TRAINING_DATASET_EXPORT {
        uuid id PK
        uuid requested_by_user_id FK
        uuid file_id FK
        string status
    }
    SURVEY_DATA_VERSION {
        uuid id PK
    }
    ROAD_SECTION_VERSION {
        uuid id PK
    }
    PROJECT {
        uuid id PK
    }
    FIELD_INSPECTION_TASK {
        uuid id PK
    }
    FILE {
        uuid id PK
    }
    USER {
        uuid id PK
    }
}
```

Rang buoc `DEFECT_VERIFICATION_LOG`: dung mot trong `defect_id` va `ai_detection_id` phai co gia tri. Hanh dong `CONFIRM` va `REJECT` tu trang thai `OPEN` phai tham chieu `field_inspection_task_id`.

## 7. Repair

```mermaid
erDiagram
    PROJECT ||--o{ REPAIR_BATCH : owns
    REPAIR_BATCH ||--o{ REPAIR_BATCH_VERSION : versions
    REPAIR_BATCH o|--o| REPAIR_BATCH_VERSION : current_version
    REPAIR_BATCH_VERSION ||--o{ REPAIR_ITEM : contains
    DEFECT ||--o{ REPAIR_ITEM : repaired_as
    REPAIR_BATCH_VERSION ||--o{ REPAIR_APPROVAL_DECISION : reviewed
    REPAIR_ITEM ||--o{ REPAIR_APPROVAL_DECISION : decided
    USER ||--o{ REPAIR_APPROVAL_DECISION : decides
    REPAIR_BATCH_VERSION ||--o{ REPAIR_ASSIGNMENT : assigns
    USER ||--o{ REPAIR_ASSIGNMENT : leads
    USER ||--o{ REPAIR_ASSIGNMENT : assigns
    REPAIR_ITEM ||--o{ REPAIR_PROGRESS : tracks
    USER ||--o{ REPAIR_PROGRESS : records
    REPAIR_ITEM ||--o{ REPAIR_EVIDENCE : evidences
    FILE ||--o{ REPAIR_EVIDENCE : stores
    PROJECT ||--o{ UNPLANNED_DEFECT_REPORT : receives
    REPAIR_BATCH o|--o{ UNPLANNED_DEFECT_REPORT : contextualizes
    USER ||--o{ UNPLANNED_DEFECT_REPORT : reports
    REPAIR_ITEM ||--o{ REPAIR_INSPECTION_RESULT : inspects
    USER ||--o{ REPAIR_INSPECTION_RESULT : performs

    REPAIR_BATCH {
        uuid id PK
        uuid project_id FK
        uuid current_version_id FK
        string status
    }
    REPAIR_BATCH_VERSION {
        uuid id PK
        uuid repair_batch_id FK
        int version_no UK
        string status
        decimal estimated_total_cost
    }
    REPAIR_ITEM {
        uuid id PK
        uuid repair_batch_version_id FK
        uuid defect_id FK
        decimal estimated_cost
        string status
    }
    REPAIR_APPROVAL_DECISION {
        uuid id PK
        uuid repair_batch_version_id FK
        uuid repair_item_id FK
        uuid decided_by_user_id FK
        string decision
    }
    REPAIR_ASSIGNMENT {
        uuid id PK
        uuid repair_batch_version_id FK
        uuid crew_lead_user_id FK
        uuid assigned_by_user_id FK
        datetime assigned_at
        datetime ended_at
    }
    REPAIR_PROGRESS {
        uuid id PK
        uuid repair_item_id FK
        uuid recorded_by_user_id FK
        string status
        decimal actual_cost
        datetime recorded_at
    }
    REPAIR_EVIDENCE {
        uuid id PK
        uuid repair_item_id FK
        uuid file_id FK
        string evidence_stage
        spatial location
    }
    UNPLANNED_DEFECT_REPORT {
        uuid id PK
        uuid project_id FK
        uuid repair_batch_id FK
        uuid reported_by_user_id FK
        string status
    }
    REPAIR_INSPECTION_RESULT {
        uuid id PK
        uuid repair_item_id FK
        uuid inspected_by_user_id FK
        string result
        datetime inspected_at
    }
    PROJECT {
        uuid id PK
    }
    DEFECT {
        uuid id PK
        string status
    }
    USER {
        uuid id PK
    }
    FILE {
        uuid id PK
    }
}
```

`REPAIR_ITEM` chi duoc tao cho `DEFECT.status = VERIFIED` da hoan tat do thuc dia. Cap `(repair_batch_version_id, defect_id)` la duy nhat. PM chi nhap `estimated_cost`; he thong tinh `estimated_total_cost` cua version.

## 8. File, Evidence, Audit va Export

```mermaid
erDiagram
    USER o|--o{ FILE : uploads
    FILE ||--o{ EVIDENCE : backs
    DEFECT o|--o{ EVIDENCE : defect_target
    REPAIR_ITEM o|--o{ EVIDENCE : repair_target
    HANDOVER_DOCUMENT o|--o{ EVIDENCE : handover_target
    USER o|--o{ AUDIT_LOG : acts
    USER ||--o{ REPORT_EXPORT : requests
    PROJECT o|--o{ REPORT_EXPORT : scopes
    FILE o|--o{ REPORT_EXPORT : stores

    FILE {
        uuid id PK
        uuid uploaded_by_user_id FK
        string storage_uri UK
        string original_name
        string mime_type
        int size_bytes
        string checksum
        date retention_until
    }
    EVIDENCE {
        uuid id PK
        uuid file_id FK
        uuid defect_id FK
        uuid repair_item_id FK
        uuid handover_document_id FK
        string evidence_type
    }
    AUDIT_LOG {
        uuid id PK
        uuid actor_user_id FK
        datetime occurred_at
        string event_type
        string entity_type
        uuid entity_id
        json before_snapshot
        json after_snapshot
        uuid correlation_id
    }
    REPORT_EXPORT {
        uuid id PK
        uuid requested_by_user_id FK
        uuid project_id FK
        uuid file_id FK
        string format
        string status
    }
    USER {
        uuid id PK
    }
    PROJECT {
        uuid id PK
    }
    DEFECT {
        uuid id PK
    }
    REPAIR_ITEM {
        uuid id PK
    }
    HANDOVER_DOCUMENT {
        uuid id PK
    }
}
```

`EVIDENCE` bat buoc co dung mot FK nghiep vu dich non-null. `AUDIT_LOG.entity_type/entity_id` la tham chieu da hinh va khong duoc ve thanh FK vat ly.

## 9. Administration va Retention

```mermaid
erDiagram
    USER ||--o{ REMINDER_RULE : configures
    USER ||--o{ DATA_RETENTION_REQUEST : requests
    USER o|--o{ DATA_RETENTION_REQUEST : reviews
    USER ||--o{ LEGAL_HOLD : places
    USER o|--o{ LEGAL_HOLD : releases
    DATA_RETENTION_REQUEST ||--o| RETENTION_DELETION_LOG : executes
    USER ||--o{ RETENTION_DELETION_LOG : approves

    REMINDER_RULE {
        uuid id PK
        uuid configured_by_user_id FK
        string rule_type
        int days_before
        boolean is_active
    }
    DATA_RETENTION_REQUEST {
        uuid id PK
        uuid requested_by_user_id FK
        uuid reviewed_by_user_id FK
        json scope_snapshot
        string status
    }
    LEGAL_HOLD {
        uuid id PK
        uuid placed_by_user_id FK
        uuid released_by_user_id FK
        json scope_snapshot
        string status
    }
    RETENTION_DELETION_LOG {
        uuid id PK
        uuid retention_request_id FK
        uuid approved_by_user_id FK
        datetime executed_at
        string result
    }
    USER {
        uuid id PK
    }
}
```

Quan he giua `DATA_RETENTION_REQUEST` va `LEGAL_HOLD` la kiem tra lien aggregate theo `scope_snapshot`, khong phai FK. Yeu cau xoa phai bi chan neu ton tai `LEGAL_HOLD.status = ACTIVE` giao voi cung pham vi.

## 10. Cac invariant khong the hien chi bang FK

1. `SURVEY` va `DEFECT` phai neo vao dung `ROAD_SECTION_VERSION` tai thoi diem phat sinh.
2. Chi Backend/System Worker duoc chuyen `SURVEY_DATA_VERSION` sang `SERVER_CONFIRMED` sau khi cac kiem tra server bat buoc dat.
3. Moi `DEFECT OPEN` duoc giu lai phai co nhiem vu do thuc dia; chi PM duoc chuyen sang `VERIFIED` hoac `REJECTED` sau khi danh gia ket qua.
4. `REPAIR_ITEM` chi nhan `DEFECT VERIFIED` co task `COMPLETED` va `review_decision = DEFECT_CONFIRMED`.
5. Entity versioned khong cap nhat noi dung da trinh/xac nhan tai cho; phai tao version moi.
6. Mot project chi co toi da mot `PROJECT_MEMBER` PM chinh dang active tai mot thoi diem.
7. Moi task do thuc dia chi co toi da mot `FIELD_INSPECTION_ASSIGNMENT ACTIVE`.
8. `MEASUREMENT_VALIDATION_SAMPLE` phai ghep ground truth va derived measurement cung `sample_id`, `measurement_type` va don vi tuong thich.
9. Research Validation khong tu tao/chuyen trang thai `DEFECT` va khong ket luan trach nhiem `WARRANTY`.
10. Duyet xoa du lieu phai kiem tra `LEGAL_HOLD` active theo pham vi truoc khi thuc thi.
11. `User.role_code` la role toan he thong authoritative; JWT role chi la snapshot va phai duoc doi chieu voi du lieu server tren moi request.
12. Voi non-Supervisor trong MVP, `ProjectMember.role_code` phai khop `User.role_code`, membership phai active/con hieu luc va thuoc dung project cua resource.
13. Thay doi role phat `UserRoleChanged`, ghi audit va thu hoi toan bo `SESSION`/`REFRESH_TOKEN` dang active trong cung transaction; thay doi membership co hieu luc ngay o request ke tiep.
