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
 assert.deepEqual(exports,['qaCapability','qaCreateKeys','qaPublicKeys','qaSignManifest','qaSealPackage','qaOpenPackage','prepareMediaKey','sealMedia','readMediaRange','capability','installationId','createKeys','publicKeys','signManifest','verifyManifest','sealPackage','openPackage']);
 assert.match(kotlin,/ApplicationInfo.FLAG_DEBUGGABLE/);
 assert.match(kotlin,/QA_SANDBOX_REQUIRED/);
 assert.match(kotlin,/roadguard\.offline\.qa\.v1\./);
 assert.doesNotMatch(exports.filter(name=>name.startsWith('qa')).join(','),/secret|agreementProof/i);
 for(const name of ['sealPackage','openPackage']) {
  const start=kotlin.indexOf('AsyncFunction("'+name+'")');
  assert.match(kotlin.slice(start,kotlin.indexOf('\n    }',start)),/usable\(binding\)/);
 }
 for(const name of ['qaSealPackage','qaOpenPackage']) {
  const start=kotlin.indexOf('AsyncFunction("'+name+'")');
  assert.match(kotlin.slice(start,kotlin.indexOf('\n    }',start)),/qaUsable\(binding\)/);
 }
 assert.match(kotlin,/private fun openWithPrefix[\s\S]*?HandoverPackageJson\.open\([\s\S]*?trustedSender\)/);
 assert.match(kotlin,/AsyncFunction\("openPackage"\)[\s\S]*?openWithPrefix\([^\n]*trustedSender\)/);
 assert.match(kotlin,/AsyncFunction\("qaOpenPackage"\)[\s\S]*?openWithPrefix\([^\n]*trustedSender\)/);
 assert.match(bridge,/openPackage\(binding: string, envelope: string, trustedSender: string\)/);
});

test('Group 5 native production config enforces Android allowBackup=false, env-gated release signing, and iOS Secure Enclave parity',()=>{
  const manifest=fs.readFileSync('android/app/src/main/AndroidManifest.xml','utf8');
  assert.match(manifest,/android:allowBackup="false"/);
  assert.match(manifest,/tools:replace="android:allowBackup"/);

  const gradle=fs.readFileSync('android/app/build.gradle','utf8');
  assert.match(gradle,/ROADGUARD_UPLOAD_STORE_FILE/);
  assert.match(gradle,/roadguard\.requireReleaseSigning/);
  assert.doesNotMatch(gradle,/storePassword\s+['"][^a][^n]/);

  const appJson=JSON.parse(fs.readFileSync('app.json','utf8'));
  assert.equal(appJson.expo.ios.bundleIdentifier,'com.hoanghai.roadguard');
  assert.equal(appJson.expo.ios.infoPlist.ITSAppUsesNonExemptEncryption,false);
  assert.ok(appJson.expo.plugins.some(p=>Array.isArray(p)&&p[0]==='expo-sqlite'&&p[1]?.useSQLCipher===true));

  const expoModCfg=JSON.parse(fs.readFileSync('modules/roadguard-offline-crypto/expo-module.config.json','utf8'));
  assert.deepEqual(expoModCfg.platforms,['android','ios']);
  assert.deepEqual(expoModCfg.ios,{modules:['RoadguardOfflineCryptoModule']});

  const podspec=fs.readFileSync('modules/roadguard-offline-crypto/ios/RoadguardOfflineCrypto.podspec','utf8');
  assert.match(podspec,/ExpoModulesCore/);
  assert.match(podspec,/:ios => '15\.0'/);

  const swift=fs.readFileSync('modules/roadguard-offline-crypto/ios/RoadguardOfflineCryptoModule.swift','utf8');
  assert.match(swift,/Name\("RoadguardOfflineCrypto"\)/);
  assert.match(swift,/SecureEnclave\.isAvailable/);
  assert.match(swift,/UNAVAILABLE_NO_SECURE_ENCLAVE/);
  assert.match(swift,/kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly/);
  assert.match(swift,/kSecAttrSynchronizable:\s*kCFBooleanFalse/);
  assert.match(swift,/P256\.Signing\.ECDSASignature/);
  assert.doesNotMatch(swift,/ECDSAKeySignature/);
  assert.match(swift,/roadguard\.h5\.direct-sync\.v1\\0/);
  assert.match(swift,/huy-final\.offline\.bundle\.v1/);
  assert.match(swift,/roadguard\.h5\.recipient-key\.v1/);
  assert.match(swift,/RGLOCAL\\u\{01\}/);
  assert.doesNotMatch(swift,/AsyncFunction\("qa/);
  assert.doesNotMatch(swift,/agreementProof/);
});
