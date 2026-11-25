const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('production native bridge exposes no ECDH secret or derived-secret diagnostic',()=>{
 const kotlin=fs.readFileSync('modules/roadguard-offline-crypto/android/src/main/java/roadguard/offline/RoadguardOfflineCryptoModule.kt','utf8');
 const bridge=fs.readFileSync('modules/roadguard-offline-crypto/index.ts','utf8');
 assert.doesNotMatch(kotlin,/AsyncFunction\("agreementProof"\)|generateSecret\(|javax\.crypto\.KeyAgreement/);
 assert.doesNotMatch(bridge,/agreementProof/);
 assert.match(bridge,/NATIVE_ACCEPTANCE_VERIFIED = false/);
 const exports=[...kotlin.matchAll(/AsyncFunction\("([^"]+)"\)/g)].map(m=>m[1]);
 assert.deepEqual(exports,['prepareMediaKey','sealMedia','readMediaRange','capability','installationId','createKeys','publicKeys','signManifest','verifyManifest','sealPackage','openPackage']);
 for(const name of ['sealPackage','openPackage']) {
  const start=kotlin.indexOf('AsyncFunction("'+name+'")');
  assert.match(kotlin.slice(start,kotlin.indexOf('\n    }',start)),/usable\(binding\)/);
 }
 assert.match(kotlin,/HandoverPackageJson\.open\([^\n]*trustedSender/);
 assert.match(bridge,/openPackage\(binding: string, envelope: string, trustedSender: string\)/);
});
