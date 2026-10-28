using System.Security.Cryptography;
using System.Text;
public static class Authentication {
const int MaxPayloadBytes = 16*1024*1024;
static readonly byte[] ClaimPurpose = Encoding.UTF8.GetBytes("roadguard.h5.direct-sync.v1\0");
    private static byte[] ClaimDigest(ReadOnlySpan<byte> claim)
    {
        if (claim.Length is < 1 or > MaxPayloadBytes)
            throw new ArgumentException("Sync claim is outside its versioned bound.", nameof(claim));
        using var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        hash.AppendData(ClaimPurpose); hash.AppendData(claim); return hash.GetHashAndReset();
    }
    internal static byte[] Decode(string value, int maximumBytes, int? exactBytes = null)
    {
        if (string.IsNullOrEmpty(value) || value.Length > 4L * ((maximumBytes + 2L) / 3L))
            throw new ArgumentException("Encoded crypto field is empty or exceeds its bound.", nameof(value));
        byte[] decoded;
        try { decoded = Convert.FromBase64String(value); }
        catch (FormatException ex) { throw new ArgumentException("Malformed base64 crypto field.", nameof(value), ex); }
        if (decoded.Length > maximumBytes || exactBytes.HasValue && decoded.Length != exactBytes
            || Convert.ToBase64String(decoded) != value)
            throw new ArgumentException("Crypto field length or base64 representation is not canonical.", nameof(value));
        return decoded;
    }
    internal static ECDsa ImportSigningKey(string value)
    {
        var bytes = Decode(value, 128); var key = ECDsa.Create();
        try { key.ImportSubjectPublicKeyInfo(bytes, out var used); P256(key.ExportParameters(false), used == bytes.Length); return key; }
        catch (Exception ex) when (ex is CryptographicException or ArgumentException)
        { key.Dispose(); throw new ArgumentException("Signing key must be a complete P256 SPKI public key.", nameof(value), ex); }
    }
    private static void P256(ECParameters parameters, bool complete)
    {
        if (!complete || parameters.Curve.Oid.Value != "1.2.840.10045.3.1.7" || parameters.Q.X?.Length != 32 || parameters.Q.Y?.Length != 32)
            throw new ArgumentException("Only the versioned P256 curve is supported.");
    }

public static byte[] Digest(byte[] bytes)=>ClaimDigest(bytes);
public static bool Verify(byte[] bytes,string signature,string publicKey) { using var key=ImportSigningKey(publicKey);return key.VerifyHash(ClaimDigest(bytes),Decode(signature,64,64),DSASignatureFormat.IeeeP1363FixedFieldConcatenation); }
}