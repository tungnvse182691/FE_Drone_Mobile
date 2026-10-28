using System.Security.Cryptography;
using System.Text.Json;
public static class OfflineWorkflowEngine
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    public static string FieldCoreHash(OfflineOperationInput operation)
    {
        ArgumentNullException.ThrowIfNull(operation);
        return operation.Kind switch
        {
            "FIELD_ACCEPT" when operation.FieldAction is not null => Hash(new { id = operation.TaskId, input = operation.FieldAction, operation.OriginalActorId }),
            "FIELD_START" when operation.FieldStart is not null => Hash(new { id = operation.TaskId, input = operation.FieldStart, operation.OriginalActorId }),
            "FIELD_SUBMISSION" when operation.FieldSubmission is not null => Hash(new { id = operation.TaskId, input = operation.FieldSubmission, operation.OriginalActorId }),
            _ => throw new ArgumentException("A typed FIELD body is required.", nameof(operation))
        };
    }
    public static string EnvelopeHash(OfflineOperationInput operation) => Hash(operation);
    public static OfflineOperationDescriptor Describe(OfflineOperationInput operation)
    {
        ArgumentNullException.ThrowIfNull(operation);
        if (operation.SchemaVersion != 1 || operation.OriginId == Guid.Empty || operation.EffectId != operation.OriginId ||
            operation.OriginalActorId == Guid.Empty || operation.SourceDeviceId == Guid.Empty || operation.TaskId == Guid.Empty ||
            operation.AssignmentId == Guid.Empty || operation.SnapshotId == Guid.Empty || operation.Dependencies is null ||
            operation.Dependencies.Length > 1000 || operation.Dependencies.Any(x => x == Guid.Empty || x == operation.OriginId) ||
            operation.Dependencies.Distinct().Count() != operation.Dependencies.Length ||
            operation.CorePayloadHash is null || operation.CorePayloadHash.Length != 64 || operation.CorePayloadHash.Any(x => !char.IsAsciiHexDigit(x)))
            throw new ArgumentException("The typed offline envelope is invalid.", nameof(operation));
        try { if (Convert.FromBase64String(operation.TaskVersion).Length != 8) throw new ArgumentException("A task version is required."); }
        catch (FormatException exception) { throw new ArgumentException("Task version is malformed.", nameof(operation), exception); }
        if (operation.Kind is "FIELD_ACCEPT" or "FIELD_START" or "FIELD_SUBMISSION")
        {
            var validBody = operation.Kind == "FIELD_ACCEPT"
                ? operation.FieldAction is not null && operation.FieldStart is null && operation.FieldSubmission is null &&
                  operation.FieldAction.AssignedToUserId is null && operation.FieldAction.Handover is null &&
                  !string.IsNullOrWhiteSpace(operation.FieldAction.Reason) && operation.FieldAction.Reason.Length <= 2000
                : operation.Kind == "FIELD_START"
                ? operation.FieldStart is not null && operation.FieldSubmission is null && operation.FieldStart.OriginId == operation.OriginId && operation.FieldStart.DeviceId == operation.SourceDeviceId
                : operation.FieldSubmission is not null && operation.FieldStart is null && operation.FieldSubmission.OriginId == operation.OriginId && operation.FieldSubmission.DeviceId == operation.SourceDeviceId;
            if (!validBody || operation.Kind != "FIELD_ACCEPT" && operation.FieldAction is not null || operation.Repair is not null ||
                !string.Equals(FieldCoreHash(operation), operation.CorePayloadHash, StringComparison.Ordinal))
                throw new ArgumentException("FIELD body does not match the signed envelope.", nameof(operation));
        }
        else
        {
            var repair = operation.Repair;
            var matched = repair is not null && repair.ResourceId != Guid.Empty && (operation.Kind switch
            {
                "REPAIR_ASSESSMENT" => repair.Action == "assessment" && repair.Assessment is not null &&
                    repair.Start is null && repair.Finish is null && repair.Assessment.OriginId == operation.OriginId &&
                    repair.Assessment.DeviceId == operation.SourceDeviceId && repair.Assessment.FieldFirstStartId != Guid.Empty,
                "REPAIR_EXECUTION_START" => repair.Action == "execution-start" && repair.Start is not null &&
                    repair.Assessment is null && repair.Finish is null && repair.Start.OriginId == operation.OriginId &&
                    repair.Start.DeviceId == operation.SourceDeviceId && repair.Start.FieldFirstStartId != Guid.Empty &&
                    repair.Start.AssessmentId != Guid.Empty,
                "REPAIR_EXECUTION_FINISH" => repair.Action == "execution-finish" && repair.Finish is not null &&
                    repair.Start is null && repair.Assessment is null && repair.Finish.OriginId == operation.OriginId &&
                    repair.Finish.DeviceId == operation.SourceDeviceId && repair.Finish.ExecutionStartId != Guid.Empty,
                _ => false
            });
            if (!matched || operation.FieldStart is not null || operation.FieldSubmission is not null || operation.FieldAction is not null)
                throw new ArgumentException("A single matched typed repair body is required.", nameof(operation));
            // The actual H4 adapter separately recomputes its canonical hash and validates loaded business scope.
        }
        return new(operation.OriginId, operation.EffectId, operation.Kind, EnvelopeHash(operation), operation.CorePayloadHash,
            operation.TaskId, operation.AssignmentId, operation.SnapshotId, operation.Repair?.ResourceId);
    }
    public static byte[] CanonicalManifest(Guid projectId, Guid batchId, Guid sourceRegistrationId,
        IReadOnlyList<OfflineOperationDescriptor> descriptors)
    {
        ArgumentNullException.ThrowIfNull(descriptors);
        if (projectId == Guid.Empty || batchId == Guid.Empty || sourceRegistrationId == Guid.Empty || descriptors.Count is < 1 or > 1000 ||
            descriptors.Any(x => x is null) || descriptors.Select(x => x.OriginId).Distinct().Count() != descriptors.Count)
            throw new ArgumentException("A bounded unique descriptor set is required.", nameof(descriptors));
        return JsonSerializer.SerializeToUtf8Bytes(new
        {
            schemaVersion = 1,
            projectId,
            sourceBatchId = batchId,
            sourceDeviceRegistrationId = sourceRegistrationId,
            items = descriptors.OrderBy(x => x.OriginId.ToString("N"), StringComparer.Ordinal).ToArray()
        }, Json);
    }
    public static byte[] CanonicalAttachedPayload(Guid sourceBatchId, Guid sourceRegistrationId,
        OfflineOperationInput[] operations, string sourceSignature)
    {
        if (sourceBatchId == Guid.Empty || sourceRegistrationId == Guid.Empty || string.IsNullOrWhiteSpace(sourceSignature))
            throw new ArgumentException("A signed source batch is required.");
        ValidateOperations(operations);
        return JsonSerializer.SerializeToUtf8Bytes(new OfflineSignedBatchInput(sourceBatchId, sourceRegistrationId, operations, sourceSignature), Json);
    }
    public static Guid[] ReadyOrigins(OfflineOperationInput[] operations, IReadOnlyDictionary<Guid, string> results)
    {
        ValidateOperations(operations); ArgumentNullException.ThrowIfNull(results);
        return operations.Where(x => !results.ContainsKey(x.OriginId) && x.Dependencies.All(id => results.TryGetValue(id, out var state) && state is "COMMITTED" or "REPLAYED"))
            .Select(x => x.OriginId).ToArray();
    }
    public static string SyncLateness(DateTimeOffset? independentlyVerifiedFinishedAt, DateTimeOffset receivedAt)
    {
        if (receivedAt == default) throw new ArgumentException("Server receive time is required.", nameof(receivedAt));
        return independentlyVerifiedFinishedAt.HasValue
            ? receivedAt < independentlyVerifiedFinishedAt.Value.AddHours(24) ? "ON_TIME" : "LATE"
            : "UNKNOWN";
    }
    private static void ValidateOperations(OfflineOperationInput[] operations)
    {
        ArgumentNullException.ThrowIfNull(operations);
        if (operations.Length is < 1 or > 1000 || operations.Any(x => x is null) || operations.Select(x => x.OriginId).Distinct().Count() != operations.Length)
            throw new ArgumentException("A bounded unique operation batch is required.", nameof(operations));
        foreach (var operation in operations) _ = Describe(operation);
    }
    private static string Hash(object value) => Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(value, Json))).ToLowerInvariant();
}
