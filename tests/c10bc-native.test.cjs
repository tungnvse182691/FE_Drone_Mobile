const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
test('C10BC JVM strict DER/P1363, P256 point, domain separated signer and ECDH tests',()=>{
 const base='modules/roadguard-offline-crypto/android';
 assert.ok(fs.existsSync(base+'/src/main/java/roadguard/offline/StrictP256.java'),'native strict codec required');
 fs.mkdirSync('.cache/c10bc-jvm',{recursive:true});
 const c=cp.spawnSync('javac',['-d','.cache/c10bc-jvm',base+'/src/main/java/roadguard/offline/StrictP256.java',base+'/src/test/java/roadguard/offline/StrictP256Test.java',base+'/src/test/java/roadguard/offline/InteropCli.java'],{encoding:'utf8'});
 assert.equal(c.status,0,c.stderr);
 const r=cp.spawnSync('java',['-cp','.cache/c10bc-jvm','roadguard.offline.StrictP256Test'],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/PASS/);
});

test('C10BC JVM JCA <-> pinned .NET oracle SPKI/P1363 interop (not Android)',()=>{
 // Build this oracle independently: test-file concurrency must not depend on C10A having built its cache first.
 const output=require('node:path').resolve('.cache/c10bc-dotnet/bin'),intermediate=require('node:path').resolve('.cache/c10bc-dotnet/obj')+'/';
 const build=cp.spawnSync('dotnet',['build','tests/c10-reference/Reference.csproj','--nologo','-o',output,'-p:BaseIntermediateOutputPath='+intermediate],{encoding:'utf8'});
 assert.equal(build.status,0,build.stdout+build.stderr);
 const vector=JSON.parse(fs.readFileSync('tests/c10-reference/vector.json','utf8')).expected,claim=Buffer.from(vector.manifest).toString('base64');
 const run=args=>{const r=cp.spawnSync('java',['-cp','.cache/c10bc-jvm','roadguard.offline.InteropCli',...args],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
 assert.equal(run(['verify',claim,vector.publicKey,vector.signature]),'true');
 assert.equal(run(['verify',Buffer.from(vector.manifest+'x').toString('base64'),vector.publicKey,vector.signature]),'false');
 const [publicKey,signature]=run(['sign',claim]).split(/\r?\n/);
 const result=cp.spawnSync('dotnet',[require('node:path').join(output,'Reference.dll')],{input:JSON.stringify({mode:'verify',claim,signature,publicKey})+'\n',encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout.trim()).valid,true);
});
