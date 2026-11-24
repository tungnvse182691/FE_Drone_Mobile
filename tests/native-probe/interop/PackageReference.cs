using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Reflection;
using RoadGuardSystem.BusinessObjects.Offline;

// Executable oracle compiles the pinned BE files without editing BE. Synthetic keys only.
using var doc=JsonDocument.Parse(Console.In.ReadToEnd());var x=doc.RootElement;
var options=new JsonSerializerOptions(JsonSerializerDefaults.Web);
string S(string name)=>x.GetProperty(name).GetString()!;
if(S("mode")=="seal") {
  using var sender=OfflineDeviceKeys.Generate(Guid.Parse("11111111-1111-4111-8111-111111111111"),"source-qa");
  var recipient=new OfflineDevicePublicKeys(Guid.Parse("22222222-2222-4222-8222-222222222222"),"recipient-qa",S("publicKey"),S("signingPublicKey"));
  var plain=Encoding.UTF8.GetBytes("Bằng chứng Java và BE — thử nghiệm");
  var header=OfflinePackageHeader.Create(Guid.Parse("33333333-3333-4333-8333-333333333333"),Guid.Parse("44444444-4444-4444-8444-444444444444"),sender.PublicKeys.ActorId,sender.PublicKeys.DeviceId,
    new[]{Guid.Parse("55555555-5555-4555-8555-555555555555")},Convert.ToHexString(SHA256.HashData(plain)).ToLowerInvariant());
  var package=OfflineHandoverCrypto.Seal(header,plain,sender,new[]{recipient});
  Console.Write(JsonSerializer.Serialize(new {package,plaintext=Convert.ToBase64String(plain),canonicalHeader=Convert.ToBase64String(OfflineCryptoFormat.CanonicalHeader(header)),canonicalUnsigned=Convert.ToBase64String(OfflineCryptoFormat.CanonicalUnsignedPackage(package))},options));
} else {
  // JVM-generated, isolated fixture key; never reads app keys or Android storage.
  using var encryption=ECDiffieHellman.Create();encryption.ImportPkcs8PrivateKey(Convert.FromBase64String(S("fixturePrivateKey")),out _);
  using var signing=ECDsa.Create(ECCurve.NamedCurves.nistP256);
  var keys=new OfflineDevicePublicKeys(Guid.Parse("22222222-2222-4222-8222-222222222222"),"recipient-qa",Convert.ToBase64String(encryption.ExportSubjectPublicKeyInfo()),Convert.ToBase64String(signing.ExportSubjectPublicKeyInfo()));
  var ctor=typeof(OfflineDeviceKeys).GetConstructors(BindingFlags.Instance|BindingFlags.NonPublic).Single();
  using var recipient=(OfflineDeviceKeys)ctor.Invoke(new object[]{encryption,signing,keys});
  var package=x.GetProperty("package").Deserialize<OfflineEncryptedPackage>(options)!;
  using var opened=OfflineHandoverCrypto.Open(package,recipient,S("trustedSigner"));
  if(opened.EvidenceVerified||opened.TimeEstablished||opened.BusinessAuthorized)throw new Exception("Unexpected business authority");
  Console.Write(JsonSerializer.Serialize(new{plaintext=Convert.ToBase64String(opened.Plaintext.Span),canonicalUnsigned=Convert.ToBase64String(OfflineCryptoFormat.CanonicalUnsignedPackage(package))},options));
}
