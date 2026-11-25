using System.Text;
using System.Text.Json;
using System.Security.Cryptography;
Console.InputEncoding = Encoding.UTF8; Console.OutputEncoding = Encoding.UTF8;
var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
while(Console.ReadLine() is { } line) {
 try {
  using var request=JsonDocument.Parse(line); var r=request.RootElement;
  if(r.GetProperty("mode").GetString()=="verify") {
   Console.WriteLine(JsonSerializer.Serialize(new {valid=Authentication.Verify(Convert.FromBase64String(r.GetProperty("claim").GetString()!),r.GetProperty("signature").GetString()!,r.GetProperty("publicKey").GetString()!)}));continue;
  }
  var op=r.GetProperty("operation").Deserialize<OfflineOperationInput>(options)!;
  if(op.Kind.StartsWith("FIELD_"))op=op with {CorePayloadHash=OfflineWorkflowEngine.FieldCoreHash(op)};
  else if(op.Repair is { } repair) {
   // b891e88 RepairCommandCoreHash.Compute<T>: same ordered wrapper and Web serializer.
   string Core<T>(T input) => Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(
    new {schemaVersion=1,kind=op.Kind,taskId=op.TaskId,itemId=repair.ResourceId,originalActorId=op.OriginalActorId,input},options))).ToLowerInvariant();
   op=op with {CorePayloadHash=op.Kind switch {
    "REPAIR_ASSESSMENT" => Core(repair.Assessment!),
    "REPAIR_EXECUTION_START" => Core(repair.Start!),
    "REPAIR_EXECUTION_FINISH" => Core(repair.Finish!),
    _ => throw new ArgumentException()
   }};
  }
  var descriptor=OfflineWorkflowEngine.Describe(op);
  var manifest=OfflineWorkflowEngine.CanonicalManifest(r.GetProperty("projectId").GetGuid(),r.GetProperty("batchId").GetGuid(),r.GetProperty("registrationId").GetGuid(),new[]{descriptor});
  using var key=ECDsa.Create(ECCurve.NamedCurves.nistP256);
  var signature=Convert.ToBase64String(key.SignHash(Authentication.Digest(manifest),DSASignatureFormat.IeeeP1363FixedFieldConcatenation));
  Console.WriteLine(JsonSerializer.Serialize(new {operation=JsonSerializer.Serialize(op,options),descriptor,manifest=Encoding.UTF8.GetString(manifest),digest=Convert.ToHexString(Authentication.Digest(manifest)).ToLowerInvariant(),signature,publicKey=Convert.ToBase64String(key.ExportSubjectPublicKeyInfo()),attached=Encoding.UTF8.GetString(OfflineWorkflowEngine.CanonicalAttachedPayload(r.GetProperty("batchId").GetGuid(),r.GetProperty("registrationId").GetGuid(),new[]{op},signature))},options));
 } catch(Exception e) { Console.WriteLine(JsonSerializer.Serialize(new {error=e.GetType().Name})); }
}
