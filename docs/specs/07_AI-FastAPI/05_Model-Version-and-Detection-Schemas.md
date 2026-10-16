# Model versions and detection schemas

The Backend pins released `ModelVersionId`, preprocessing/config versions, mode and manifest hash on the processing job. The AI repository's `AIDetectionPayloadFormatter` emits a richer internal record: detection ID, processing job, model version, defect type, target band, overlap flag, confidence, optional geometry/station, camera pose and raw bbox/crop URI. `MockAIAdapter` generates synthetic pothole/crack examples and marks `is_mock=true`.

For the Backend callback, the canonical wire is the DTO in `RoadGuardSystem.DTOs/Processing/ReceiveAiResultRequestDto.cs` and Phase 2C API-031: detection ID, frame file ID, timestamp, type code, confidence and normalized bbox. The AI formatter's `estimated_width`/`estimated_length` and geometry fields must not be copied into physical Crew measurements; any mapping requires an approved contract and provenance review.

Model class names, checkpoint files, confidence metrics and class coverage are repository facts only. A configured model path or README claim is not a released model, and no accuracy/F1/recall result is asserted. `CURRENT_IMPLEMENTED_AI` source schema and `CURRENT_IMPLEMENTED_BE` DTO validation are separate from `NOT_VERIFIED_E2E` compatibility.

Road segment/section IDs and image segmentation masks have different semantics. Preserve frame/timestamp/model/checksum provenance when transforming a detection into a Backend candidate.
