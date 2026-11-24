const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path');
test('sealed package preserves canonical identity and rejects tampering/wrong recipient (JVM only)',()=>{
  const root='modules/roadguard-offline-crypto/android/src/main/java/roadguard/offline/';
  assert.ok(fs.existsSync(root+'HandoverPackage.java'),'complete native package sealing/opening is missing');
  const out=path.resolve('.cache/handover-package-jvm');fs.mkdirSync(out,{recursive:true});
  const c=cp.spawnSync('javac',['-d',out,...['StrictP256.java','HandoverPrimitives.java','HandoverPackage.java'].map(v=>root+v),'tests/native-probe/jvm/HandoverPackageTest.java'],{encoding:'utf8'});assert.equal(c.status,0,c.stderr);
  const r=cp.spawnSync('java',['-cp',out,'roadguard.offline.HandoverPackageTest'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/PASS/);
});
