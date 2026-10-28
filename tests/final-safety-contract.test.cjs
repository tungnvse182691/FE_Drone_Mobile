const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=require('./final-reference/safety-source.json');
function workflow(){const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/crewSafetyWorkflow.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:m,exports:m.exports,require:n=>n==='./crewApi'?{isCrewResourceId:v=>typeof v==='string'&&/^[a-f0-9-]{36}$/.test(v)}:{},Date});return m.exports;}
test('FINAL safety route + action + role mapping derives from pinned BE controller/repository and ledger',()=>{
 assert.equal(source.sha,'01cc4725b178199215b02f4ddf7093491a16f2f7');
 const routes=new Map([...source.controller.matchAll(/\[Http(Post|Get)(?:\("([^"]+)"\))?\]\s+public Task<IActionResult> (\w+)/g)].map(m=>[m[3],{method:m[1].toUpperCase(),suffix:m[2]??''}]));
 const base=/\[Route\("([^"]+)"\)\]/.exec(source.controller)[1].replace('v{version:apiVersion}','v1').replace(/:guid/g,'');
 const {randomUUID:id}=require('node:crypto'),r={projectId:id(),packageId:id(),itemId:id(),measureId:id()},warningId=id();
 const cases=[['153','Check',{kind:'check',result:'Safe',findings:'observed',evidenceIds:[id()]}],['154','Install',{kind:'installation',firstCheckDueAt:'2026-10-29T00:00:00Z',reason:'observed'}],['155','Acknowledge',{kind:'acknowledgement',warningId,reason:'observed'}]];
 for(const [api,action,command] of cases){const route=routes.get(action),row=source.ledger.find(x=>x.startsWith(`| API-${api} `));assert.ok(row.includes(`${route.method} \`/${base}/${route.suffix.replace(/:guid/g,'')}\``));
  const expected=('/'+base+'/'+route.suffix.replace(/:guid/g,'')).replace('/api/v1','').replace(/\{(\w+)\}/g,(_,k)=>({...r,warningId})[k]);
  assert.equal(workflow().safetyRequest(r,command).path,expected);assert.match(source.guardMethods[action],/command\.Role != UserRoleCode\.RepairCrew/);assert.match(source.guardMethods[action],/command\.ActorId != binding\.CrewId/);
 }
 assert.match(source.guardMethods.Create,/command\.Role != UserRoleCode\.ProjectManager/);assert.equal(routes.get('Create').method,'POST');
 assert.match(source.controller,/Request\.Headers\["Idempotency-Key"\]/);assert.match(source.controller,/Request\.Headers\.IfMatch/);
});
