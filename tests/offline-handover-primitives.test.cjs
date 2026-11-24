const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');
const path=require('node:path');

test('native handover primitives: RFC5869, raw P256 ECDH, authenticated AES and bounds (JVM only)',()=>{
  const source='modules/roadguard-offline-crypto/android/src/main/java/roadguard/offline/HandoverPrimitives.java';
  assert.ok(fs.existsSync(source),'native internal AEAD/KDF primitives are not implemented');
  const out=path.resolve('.cache/handover-primitives-jvm');fs.mkdirSync(out,{recursive:true});
  const compile=cp.spawnSync('javac',['-d',out,source,'modules/roadguard-offline-crypto/android/src/main/java/roadguard/offline/StrictP256.java','tests/native-probe/jvm/HandoverPrimitivesTest.java','tests/native-probe/jvm/HandoverInteropCli.java'],{encoding:'utf8'});
  assert.equal(compile.status,0,compile.stderr);
  const run=cp.spawnSync('java',['-cp',out,'roadguard.offline.HandoverPrimitivesTest'],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);assert.match(run.stdout,/PASS/);
});

test('native handover primitives interoperate with independent .NET raw ECDH/HKDF/AES-GCM (not Android)',()=>{
  const out=path.resolve('.cache/handover-primitives-dotnet');
  const build=cp.spawnSync('dotnet',['build','tests/native-probe/interop/Reference.csproj','--nologo','-o',out,'-p:BaseIntermediateOutputPath='+path.resolve('.cache/handover-primitives-dotnet-obj')+'/'],{encoding:'utf8'});
  assert.equal(build.status,0,build.stdout+build.stderr);
  const java=args=>{const r=cp.spawnSync('java',['-cp',path.resolve('.cache/handover-primitives-jvm'),'roadguard.offline.HandoverInteropCli',...args],{encoding:'utf8'});assert.equal(r.status,0,'JVM interoperability failed');return r.stdout.trim();};
  const dotnet=request=>{const r=cp.spawnSync('dotnet',[path.join(out,'Reference.dll')],{input:JSON.stringify(request),encoding:'utf8'});assert.equal(r.status,0,'Independent .NET interoperability failed');return JSON.parse(r.stdout);};
  const [privateFixture,publicKey]=java(['new']).split(/\r?\n/),b64=v=>Buffer.from(v).toString('base64');
  const salt=b64(require('node:crypto').createHash('sha256').update('canonical-header-probe').digest()),context=b64('recipient-key-context-probe');
  const sealed=dotnet({mode:'agreement',publicKey,salt,context});
  assert.equal(Buffer.from(java(['open',privateFixture,sealed.publicKey,salt,context,sealed.nonce,sealed.ciphertext]),'base64').toString(),'independent-dotnet-handover-probe');
  const key=b64(Buffer.alloc(32,7)),nonce=b64(Buffer.alloc(12,9)),plaintext=b64('JVM-to-dotnet authenticated probe');
  const ciphertext=java(['encrypt',key,nonce,plaintext,context]);
  assert.equal(dotnet({mode:'decrypt',key,nonce,ciphertext,context}).plaintext,plaintext);
});
