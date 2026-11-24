// Explicit integration probe: node tests/native-probe/package-interop.cjs <read-only-BE-root>
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const be=process.argv[2];assert.ok(be,'Provide pinned BE checkout path');
function run(exe,args,input){const r=cp.spawnSync(exe,args,{encoding:'utf8',input,maxBuffer:4*1024*1024});assert.equal(r.status,0,r.stdout+r.stderr);return r.stdout.trim();}
const expected='fb2761619cce11e05e439f322efbf41e00f8a7bf';assert.equal(run('git',['-C',be,'rev-parse','HEAD']),expected,'BE SHA changed');
for(const file of ['OfflineCryptoFormat.cs','OfflineDeviceKeys.cs','OfflineHandoverCrypto.cs'])assert.equal(run('git',['-C',be,'diff','HEAD','--','RoadGuardSystem.BusinessObjects/Offline/'+file]),'','BE oracle has local modifications');
const out=path.resolve('.cache/handover-package-be'),jvm=path.resolve('.cache/handover-package-interop-jvm');fs.mkdirSync(jvm,{recursive:true});
run('dotnet',['build','tests/native-probe/interop/PackageReference.csproj','--nologo','-o',out,'-p:RoadGuardBackendRoot='+path.resolve(be),'-p:BaseIntermediateOutputPath='+path.resolve('.cache/handover-package-be-obj')+'/']);
const source='modules/roadguard-offline-crypto/android/src/main/java/roadguard/offline/';
run('javac',['-d',jvm,...['StrictP256','HandoverPrimitives','HandoverPackage'].map(v=>source+v+'.java'),'tests/native-probe/jvm/PackageInteropCli.java']);
const java=(mode,lines)=>run('java',['-cp',jvm,'roadguard.offline.PackageInteropCli',mode],lines?.join('\n')+'\n').split(/\r?\n/);
const oracle=req=>JSON.parse(run('dotnet',[path.join(out,'PackageReference.dll')],JSON.stringify(req)));
const [fixturePrivateKey,publicKey,signingPublicKey]=java('keys');
const sealed=oracle({mode:'seal',publicKey,signingPublicKey});
function lines(p,trusted=p.senderSigningPublicKey){const h=p.header;return [fixturePrivateKey,publicKey,h.version,h.payloadSchema,h.packageId,h.projectId,h.originalActorId,h.sourceDeviceId,h.originIds.join(','),h.payloadSha256,p.payloadNonce,p.ciphertext,p.payloadTag,p.senderSigningPublicKey,p.signature,p.recipients.length,...p.recipients.flatMap(w=>[w.actorId,w.deviceId,w.recipientKeyFingerprint,w.ephemeralPublicKey,w.nonce,w.wrappedKey,w.tag]),trusted].map(String);}
const opened=java('open',lines(sealed.package));assert.equal(opened[0],sealed.plaintext);assert.equal(opened[1],sealed.canonicalHeader);assert.equal(opened[2],sealed.canonicalUnsigned);
const [json,plaintext,canonical]=java('seal',[publicKey,signingPublicKey]);const p=JSON.parse(json);
const reverse=oracle({mode:'open',fixturePrivateKey,package:p,trustedSigner:p.senderSigningPublicKey});assert.equal(reverse.plaintext,plaintext);assert.equal(reverse.canonicalUnsigned,canonical);
const tampered=structuredClone(p);tampered.header.sourceDeviceId='tampered';
assert.throws(()=>oracle({mode:'open',fixturePrivateKey,package:tampered,trustedSigner:p.senderSigningPublicKey}));
assert.throws(()=>java('open',lines(sealed.package,signingPublicKey)));
console.log('PASS: pinned BE <-> Java sealed packages; exact canonical bytes; Unicode payload; tamper and untrusted signer rejected. NOT Android, grants or production acceptance. BE '+expected);
