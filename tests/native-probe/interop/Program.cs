using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
// Independent standard-library oracle. Test vectors only; never handles application keys.
using var r=JsonDocument.Parse(Console.In.ReadToEnd());var x=r.RootElement;
byte[] Read(string name)=>Convert.FromBase64String(x.GetProperty(name).GetString()!);
if(x.GetProperty("mode").GetString()=="agreement") {
  using var peer=ECDiffieHellman.Create();peer.ImportSubjectPublicKeyInfo(Read("publicKey"),out _);
  using var local=ECDiffieHellman.Create(ECCurve.NamedCurves.nistP256);
  var secret=local.DeriveRawSecretAgreement(peer.PublicKey);
  var key=HKDF.DeriveKey(HashAlgorithmName.SHA256,secret,32,Read("salt"),Read("context"));
  try {
    var nonce=RandomNumberGenerator.GetBytes(12);var plain=Encoding.UTF8.GetBytes("independent-dotnet-handover-probe");var cipher=new byte[plain.Length];var tag=new byte[16];
    using var aes=new AesGcm(key,16);aes.Encrypt(nonce,plain,cipher,tag,Read("context"));
    Console.Write(JsonSerializer.Serialize(new{publicKey=Convert.ToBase64String(local.ExportSubjectPublicKeyInfo()),nonce=Convert.ToBase64String(nonce),ciphertext=Convert.ToBase64String(cipher.Concat(tag).ToArray())}));
  }finally{CryptographicOperations.ZeroMemory(secret);CryptographicOperations.ZeroMemory(key);}
} else {
  var input=Read("ciphertext");var plain=new byte[input.Length-16];
  using var aes=new AesGcm(Read("key"),16);aes.Decrypt(Read("nonce"),input.AsSpan(0,plain.Length),input.AsSpan(plain.Length),plain,Read("context"));
  Console.Write(JsonSerializer.Serialize(new{plaintext=Convert.ToBase64String(plain)}));
}
