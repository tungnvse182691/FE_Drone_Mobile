const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(fetch){const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/droneStorageTransfer.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:mod,exports:mod.exports,require:n=>{assert.equal(n,'expo/fetch');return {fetch};},AbortController,setTimeout,clearTimeout});return mod.exports;}
test('Operator storage PUT preserves binary bytes without auth or JSON/base64 conversion',async()=>{
 const bytes=new Uint8Array([0,128,255]);let call;
 const api=load(async(...args)=>{call=args;return {ok:true,status:200,headers:{get:n=>n==='etag'?'"part-etag"':null}};});
 assert.equal(await api.putDroneStorageBytes('http://storage.test/part',bytes,'video/mp4'),'"part-etag"');
 assert.equal(call[1].body,bytes);assert.equal(call[1].method,'PUT');assert.deepEqual(Object.keys(call[1].headers),['Content-Type']);assert.equal(call[1].credentials,'omit');
});
test('Operator storage failures retain HTTP status without leaking signed URL or XML body',async()=>{
 const api=load(async()=>({ok:false,status:403,headers:{get:()=>null},text:async()=>'<secret-url/>'}));
 await assert.rejects(api.putDroneStorageBytes('http://storage.test/secret',new Uint8Array([1]),'video/mp4'),e=>e.response.status===403&&!e.message.includes('secret'));
 const noEtag=load(async()=>({ok:true,status:200,headers:{get:()=>null}}));
 await assert.rejects(noEtag.putDroneStorageBytes('http://storage.test',new Uint8Array([1]),'video/mp4'),/part_etag_missing/);
});
