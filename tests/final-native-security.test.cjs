const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const {AndroidConfig}=require('expo/config-plugins');
const security=require('../plugins/withRoadGuardAndroidSecurity');
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

test('Group 5 regenerates native Android security settings from the Expo template',async()=>{
  const template=entry=>execFileSync('tar',['-xOzf',require.resolve('expo/template.tgz'),`package/android/app/${entry}`],{encoding:'utf8'});
  const {parseXMLAsync}=require('@expo/config-plugins/build/utils/XML');
  const generated=security.configureManifest(await parseXMLAsync(template('src/main/AndroidManifest.xml')));
  const app=AndroidConfig.Manifest.getMainApplicationOrThrow(generated).$;
  assert.equal(app['android:allowBackup'],'false');
  assert.equal(app['android:fullBackupContent'],'false');
  assert.equal(app['android:dataExtractionRules'],'@xml/roadguard_data_extraction_rules');
  assert.deepEqual(app['tools:replace'].split(',').sort(),['android:allowBackup','android:dataExtractionRules','android:fullBackupContent']);
  assert.deepEqual(security.configureManifest(generated),generated);
  const extraction=await parseXMLAsync(security.extractionRules);
  for(const mode of ['cloud-backup','device-transfer']) {
    const excluded=extraction['data-extraction-rules'][mode][0].exclude.map(item=>item.$);
    for(const domain of ['file','database','sharedpref','external','device_file','device_database','device_sharedpref']) {
      assert.ok(excluded.some(item=>item.domain===domain&&item.path==='.'));
    }
  }
  const gradle=security.configureSigning(template('build.gradle'));
  assert.equal(security.configureSigning(gradle),gradle);
  assert.match(gradle,/ROADGUARD_UPLOAD_STORE_FILE/);
  assert.match(gradle,/findProperty\('roadguard\.qaSigning'\) \?: 'false'/);
  assert.match(gradle,/!qaSigning && \(!releaseSigningConfigured \|\| !file\(releaseStore\)\.isFile\(\)\)/);
  assert.match(gradle,/signingConfig qaSigning \? signingConfigs\.debug : signingConfigs\.release/);
  assert.doesNotMatch(gradle,/storePassword\s+['"][^a][^n]/);
});

test('Group 5 iOS config delegates export determination and declares native Secure Enclave APIs',()=>{
  const appJson=JSON.parse(fs.readFileSync('app.json','utf8'));
  assert.equal(appJson.expo.ios.bundleIdentifier,'com.hoanghai.roadguard');
  assert.equal(appJson.expo.ios.infoPlist.ITSAppUsesNonExemptEncryption,undefined);
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
