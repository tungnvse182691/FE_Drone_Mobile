using System.Text.Json.Serialization;
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record OfflineOperationDescriptor(Guid OriginId, Guid EffectId, string Kind, string EnvelopeHash,
    string CorePayloadHash, Guid TaskId, Guid AssignmentId, Guid SnapshotId, Guid? RepairResourceId);
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record OfflineRepairPayload(Guid ResourceId, string Action,
    RepairExecutionStartInput? Start = null, RepairExecutionFinishInput? Finish = null,
    RepairMeasurementAssessmentInput? Assessment = null);
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record OfflineOperationInput(int SchemaVersion, Guid OriginId, Guid EffectId, string Kind,
    Guid OriginalActorId, Guid SourceDeviceId, Guid SnapshotId, Guid TaskId, Guid AssignmentId,
    string TaskVersion, string CorePayloadHash, Guid[] Dependencies, DateTimeOffset? ClaimedFinishedAt,
    FieldStartInput? FieldStart = null, FieldSubmissionInput? FieldSubmission = null,
    OfflineRepairPayload? Repair = null, FieldTaskActionInput? FieldAction = null);
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record OfflineSignedBatchInput(Guid BatchId, Guid SourceDeviceRegistrationId,
    OfflineOperationInput[] Operations, string Signature);
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record FieldTaskActionInput(string Reason, Guid? AssignedToUserId = null, FieldHandoverInput? Handover = null);
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record FieldHandoverInput(string PerformedPortionState, string Summary, Guid StartOriginId, Guid[] SubmissionIds, Guid? RecipientUserId);
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record FieldStartInput(Guid OriginId, DateTimeOffset ClaimedAt, Guid? DeviceId = null,
    long? MonotonicMilliseconds = null, string? BootId = null, string? OfflineProof = null);
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record FieldMeasurementInput(string SampleId, string Type, decimal? Value, string State,
    string? UnknownReason, string Dimension, string Unit, double? Longitude, double? Latitude,
    string? LocationReason, string Instrument, string Method, string? Notes = null);
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record FieldEvidenceDeclaration(Guid CaptureOriginId, Guid? FileId, string Purpose,
    string ChecksumSha256, string MediaType, DateTimeOffset? CapturedAt, string? AttemptChecklist);
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record FieldPositionProofInput(string Kind, string? Checklist, double? Longitude, double? Latitude, string? ObservedSlabId = null, Guid? ObservedSegmentId = null, Guid? ObservedRouteVersionId = null, double? ObservedChainageMeters = null);
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record FieldSubmissionInput(Guid OriginId, Guid StartOriginId, Guid? ParentSubmissionId,
    FieldMeasurementInput[]? Measurements, FieldEvidenceDeclaration[]? Evidence, FieldPositionProofInput? LocationProof,
    string CaptureType, bool? Repaired, string? UnrepairedReason, Guid? DeviceId = null);
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record RepairMeasurementAssessmentInput(Guid OriginId, Guid FieldFirstStartId,
    FieldMeasurementInput[]? Measurements, FieldEvidenceDeclaration[]? Evidence,
    FieldPositionProofInput? LocationProof, Guid? DeviceId = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] Dictionary<string, bool?>? StopConditions = null);
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record RepairExecutionStartInput(Guid OriginId, Guid FieldFirstStartId, DateTimeOffset ClaimedAt, Guid AssessmentId,
    Guid? DeviceId = null, long? MonotonicMilliseconds = null, string? BootId = null);
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record RepairExecutionFinishInput(Guid OriginId, Guid ExecutionStartId, DateTimeOffset ClaimedAt,
    Guid? DeviceId = null, long? MonotonicMilliseconds = null, string? BootId = null);