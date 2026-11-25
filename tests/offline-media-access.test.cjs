const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),crypto=require('node:crypto');
const actor='94949494-9494-4494-8494-949494949494',assetId='95959595-9595-4595-8595-959595959595';
function fixture(role='REPAIR_CREW'){
 const owner={actor,environment:'https://qa.invalid/api/v1',role,session:'session-1'};
 let live={...owner};const data=Uint8Array.from({length:1048583},(_,i)=>i%251),calls=[];
 const checksumSha256=crypto.createHash('sha256').update(data).digest('hex');
 const native={
  async prepareMediaKey(binding){calls.push(['prepare',binding]);return {available:true,securityLevel:'SOFTWARE'};},
  async sealMedia(binding,id,uri){calls.push(['seal',binding,id,uri]);return {version:1,assetId:id,sizeBytes:data.length,checksumSha256};},
  async readMediaRange(binding,id,offset,length){calls.push(['read',binding,id,offset,length]);return Buffer.from(data.subarray(offset,offset+length)).toString('base64');}
 };
 const module={exports:{}};
 const base64={base64ToBytes:s=>Uint8Array.from(Buffer.from(s,'base64')),bytesToBase64:b=>Buffer.from(b).toString('base64')};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/offline/mediaVaultAccess.ts','utf8'),{compilerOptions:{module:1}}).outputText,
  {module,exports:module.exports,Uint8Array,URL,require:name=>{if(name==='../utils/base64')return base64;throw Error('unexpected import '+name);}});
 const ports={native,uuid:()=>assetId,hash:async bytes=>crypto.createHash('sha256').update(bytes).digest('hex')};
 const access=module.exports.openMediaVaultAccess(owner,()=>live,ports);
 return {access,owner,data,calls,native,ports,checksumSha256,setLive:v=>live=v,
  reopen(next){live={...next};return module.exports.openMediaVaultAccess(next,()=>live,{native,uuid:()=>assetId,hash:async bytes=>crypto.createHash('sha256').update(bytes).digest('hex')});}};
}
test('three roles seal against expected bytes and bounded authenticated reads survive a new session for the same owner',async()=>{
 for(const role of ['REPAIR_CREW','DRONE_OPERATOR','REPORTER']){
  const h=fixture(role),ref=await h.access.seal('file:///owned/photo.jpg',{sizeBytes:h.data.length,checksumSha256:h.checksumSha256});
  assert.equal(ref.role,role);assert.equal('session' in ref,false);assert.equal('sourceUri' in ref,false);
  const bytes=await h.access.readAll(ref,2*1024*1024);assert.deepEqual(Buffer.from(bytes),Buffer.from(h.data));
  assert.equal(h.calls.filter(c=>c[0]==='read').length,2);assert.ok(h.calls.every(c=>c[1]===JSON.stringify([actor,'https://qa.invalid/api/v1',role])));
  assert.equal(h.calls.some(c=>c.includes('session-1')),false);
  const reopened=h.reopen({...h.owner,session:'session-2'});
  assert.deepEqual(Buffer.from(await reopened.readRange(ref,65530,65550)),Buffer.from(h.data.subarray(65530,131080)));
  await assert.rejects(h.access.readRange(ref,0,1),/media_session_changed/);
 }
});
test('snapshots caller-owned inputs across native awaits',async()=>{
 const h=fixture(),expected={sizeBytes:h.data.length,checksumSha256:h.checksumSha256};
 const original=h.native.prepareMediaKey;h.native.prepareMediaKey=async(...args)=>{expected.checksumSha256='ab'.repeat(32);return original(...args);};
 const ref=await h.access.seal('file:///owned/photo.jpg',expected);assert.equal(ref.checksumSha256,h.checksumSha256);
 const mutable={...ref};const read=h.native.readMediaRange;h.native.readMediaRange=async(...args)=>{mutable.assetId=actor;return read(...args);};
 assert.deepEqual(Buffer.from(await h.access.readAll(mutable,2*1024*1024)),Buffer.from(h.data));
});
test('rejects a session change during the checksum await and erases the pending full-read buffer',async()=>{
 const h=fixture(),ref=await h.access.seal('file:///owned/photo.jpg',{sizeBytes:h.data.length,checksumSha256:h.checksumSha256});
 let retained;
 h.ports.hash=async bytes=>{
  retained=bytes;
  const checksum=crypto.createHash('sha256').update(bytes).digest('hex');
  await Promise.resolve();h.setLive({...h.owner,session:'session-2'});return checksum;
 };
 await assert.rejects(h.access.readAll(ref,2*1024*1024),/media_session_changed/);
 assert.ok(retained);assert.ok(retained.every(byte=>byte===0));
});
test('expected metadata cannot inject identity, storage reference fields or private source data',async()=>{
 const h=fixture();
 const ref=await h.access.seal('file:///owned/photo.jpg',{sizeBytes:h.data.length,checksumSha256:h.checksumSha256,
  actor:assetId,environment:'https://other.invalid',role:'REPORTER',assetId:actor,version:99,
  session:'private-session',sourceUri:'file:///private/source.jpg'});
 assert.deepEqual(JSON.parse(JSON.stringify(ref)),{version:1,actor,environment:h.owner.environment,role:h.owner.role,
  assetId,sizeBytes:h.data.length,checksumSha256:h.checksumSha256});
});
test('rejects owner/environment/role/session changes after native awaits, before returning bytes or publishing references',async()=>{
 for(const phase of ['prepareMediaKey','sealMedia','readMediaRange']){
  const h=fixture(),ref=await h.access.seal('file:///owned/photo.jpg',{sizeBytes:h.data.length,checksumSha256:h.checksumSha256});
  const original=h.native[phase];h.native[phase]=async(...args)=>{const value=await original(...args);h.setLive({...h.owner,session:'session-2'});return value;};
  await assert.rejects(phase==='readMediaRange'?h.access.readRange(ref,0,10):h.access.seal('file:///owned/photo.jpg',{sizeBytes:h.data.length,checksumSha256:h.checksumSha256}),/media_session_changed/);
 }
 for(const key of ['actor','role','environment','session']){
  const h=fixture();h.setLive({...h.owner,[key]:'changed'});await assert.rejects(h.access.seal('file:///owned/photo.jpg',{sizeBytes:1,checksumSha256:'ab'.repeat(32)}),/media_session_changed/);assert.equal(h.calls.length,0);
 }
});
test('rejects changed source, mismatched reference, malformed native base64, truncation and corruption without fallback',async()=>{
 const h=fixture(),ref=await h.access.seal('file:///owned/photo.jpg',{sizeBytes:h.data.length,checksumSha256:h.checksumSha256});
 await assert.rejects(h.access.seal('file:///owned/photo.jpg',{sizeBytes:1,checksumSha256:h.checksumSha256}),/media_source_changed/);
 for(const change of [{actor:assetId},{environment:'https://else.invalid'},{role:'REPORTER'},{assetId:'../other'},{checksumSha256:'x'},{sizeBytes:0}])
  await assert.rejects(h.access.readRange({...ref,...change},0,1),/media_reference_invalid/);
 for(const value of ['AA!A','AA==','AAAA\n']){h.native.readMediaRange=async()=>value;await assert.rejects(h.access.readRange(ref,0,3),/media_bytes_invalid/);}
 h.native.readMediaRange=async(_b,_i,_o,l)=>Buffer.alloc(l).toString('base64');
 await assert.rejects(h.access.readAll(ref,2*1024*1024),/media_checksum_changed/);
 h.native.readMediaRange=async()=>{throw Error('MEDIA_KEY_RECOVERY_REQUIRED');};
 await assert.rejects(h.access.readRange(ref,0,3),/MEDIA_KEY_RECOVERY_REQUIRED/);
});
test('range and full-read budgets fail before native work; returned owner/reference objects cannot rebind the access',async()=>{
 const h=fixture(),ref=await h.access.seal('file:///owned/photo.jpg',{sizeBytes:h.data.length,checksumSha256:h.checksumSha256}),n=h.calls.length;
 for(const [offset,length] of [[-1,1],[0,0],[0,1048577],[h.data.length,1],[.1,1],[0,NaN]])await assert.rejects(h.access.readRange(ref,offset,length),/media_range_invalid/);
 await assert.rejects(h.access.readAll(ref,1),/media_read_budget/);assert.equal(h.calls.length,n);
 h.owner.actor=assetId;h.setLive({...h.owner});await assert.rejects(h.access.readRange(ref,0,1),/media_session_changed/);
});
