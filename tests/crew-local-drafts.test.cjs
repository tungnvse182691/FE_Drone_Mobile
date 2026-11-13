const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function harness(rows,afterRead=()=>{}) {
 const identity={actor:'actor',environment:'https://sandbox',scope:'session',role:'REPAIR_CREW',partition:'partition'};
 let current=identity,writes=0;
 const db={getAllAsync:async()=>{afterRead(()=>current=null);return rows;},runAsync:async()=>writes++};
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/crewLocalDrafts.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports,require:n=>({
  '../offline/database':{openDatabase:()=>db,initDatabase:async()=>{}},
  '../offline/upload-queue':{sameQueueIdentity:i=>i===current},
  './crewApi':{isCrewResourceId:v=>['project','task'].includes(v)},
 }[n])});
 return {identity,m:module.exports,writes:()=>writes};
}
const draft={actor:'actor',environment:'https://sandbox',scope:'session',projectId:'project',taskId:'task',measurements:[{}],captures:[{uri:'private-file',verified:false},{uri:'private-file-2',verified:true}]};
test('Crew local draft index exposes counts, never private paths or command payloads and never writes',async()=>{
 const h=harness([{id:'row',payload:JSON.stringify(draft)}]),rows=await h.m.readCrewLocalDrafts(h.identity);
 assert.equal(rows[0].photos,2);assert.equal(rows[0].verifiedPhotos,1);assert.equal(rows[0].measurements,1);assert.equal(rows[0].currentSession,true);
 assert.ok(!JSON.stringify(rows).includes('private-file'));assert.equal(h.writes(),0);
});
test('Crew local draft index excludes other actors/environments and marks historical session',async()=>{
 const h=harness([draft,{...draft,actor:'other'},{...draft,environment:'other'},{...draft,scope:'old'}].map((d,i)=>({id:String(i),payload:JSON.stringify(d)})));
 const rows=await h.m.readCrewLocalDrafts(h.identity);assert.equal(rows.length,2);assert.equal(rows[1].currentSession,false);
});
test('Crew local draft index rejects results after session changes across SQLite await',async()=>{
 const h=harness([{id:'row',payload:JSON.stringify(draft)}],switchSession=>switchSession());
 await assert.rejects(()=>h.m.readCrewLocalDrafts(h.identity),/crew_session_changed/);
});
test('Crew local index groups retained generations by project and task without treating command history as sent',async()=>{
 const h=harness([
  {id:'new',updated_at:'2026-11-13T10:00:00.000Z',payload:JSON.stringify(draft)},
  {id:'old',payload:JSON.stringify({...draft,scope:'old',command:{phase:'acknowledged',body:{private:'secret'}}})},
 ]);
 const rows=await h.m.readCrewLocalDrafts(h.identity),groups=h.m.groupCrewLocalDrafts(rows);
 assert.equal(rows.length,2);assert.equal(groups.length,1);assert.equal(groups[0].versions,2);
 assert.equal(groups[0].latest.id,'new');assert.equal(groups[0].latest.updatedAt,'2026-11-13T10:00:00.000Z');
 assert.equal(groups[0].hasCommand,true);assert.equal(groups[0].latest.hasCommand,false);
 assert.ok(!JSON.stringify(groups).includes('secret'));assert.equal(h.writes(),0);
 assert.equal(h.m.groupCrewLocalDrafts([...rows,{...rows[0],projectId:'another'}]).length,2);
});
