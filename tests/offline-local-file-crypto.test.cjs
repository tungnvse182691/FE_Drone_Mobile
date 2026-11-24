const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path');
test('native file encryption authenticates content/context before publishing and preserves originals',()=>{
 const root='modules/roadguard-offline-crypto/android/src/main/java/roadguard/offline/';
 assert.ok(fs.existsSync(root+'LocalFileCrypto.java'),'native file encryption is missing');
 const out=path.resolve('.cache/local-file-crypto-jvm');fs.mkdirSync(out,{recursive:true});
 const c=cp.spawnSync('javac',['-d',out,root+'LocalFileCrypto.java','tests/native-probe/jvm/LocalFileCryptoTest.java'],{encoding:'utf8'});assert.equal(c.status,0,c.stderr);
 const r=cp.spawnSync('java',['-cp',out,'roadguard.offline.LocalFileCryptoTest'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/PASS/);
});
