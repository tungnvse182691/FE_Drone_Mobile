const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/roadfe-screen.cjs');
test('typing each ID prefix finds the task from the first character, including later pages',async()=>{
 const h=harness(),calls=[];
 const target={id:'60a04265-aaaa-4bbb-8ccc-123456789012',taskCode:'FIELD-1a6fd922'};
 h.client.get=async(path,{params})=>{
  calls.push(params);
  // API037 searches taskCode, so none of these ID prefixes match it.
  if(params.search)return {data:{items:[],nextCursor:null}};
  return {data:{items:params.cursor?[target]:[{id:'bbbbbbbb-aaaa',taskCode:'FIELD-X'}],nextCursor:params.cursor?null:'next'}};
 };
 const m=h.load('src/api/crewApi.ts');
 for(const term of ['6','60','60A','60a0','60a04','60a042','60a0426','60a04265',target.id]){
  const result=await m.searchCrewTaskIdentityPage(null,50,new AbortController().signal,{search:term,statusGroup:'INCOMPLETE',mode:'MEASURE_ONLY',acceptance:'ACCEPTED'});
  assert.deepEqual(result.items,[target],`ID prefix ${term} must match`);
 }
 for(const q of calls){assert.equal(q.search,undefined);assert.equal(q.statusGroup,'INCOMPLETE');assert.equal(q.mode,'MEASURE_ONLY');assert.equal(q.acceptance,'ACCEPTED');}
});
test('ID search scans later pages with unchanged filters and matches ID or task code',async()=>{
 const h=harness(),calls=[];
 h.client.get=async(path,{params})=>{calls.push(params);return {data:{items:params.cursor?[{id:'5ad738f9-aaaa',taskCode:'REPAIR-X'},{id:'other',taskCode:'FIELD-5ad738'}]:[{id:'unrelated',taskCode:'FIELD-X'}],nextCursor:params.cursor?null:'next',asOf:'now'}};};
 const m=h.load('src/api/crewApi.ts');
 const result=await m.searchCrewTaskIdentityPage(null,50,new AbortController().signal,{search:'5AD738',statusGroup:'INCOMPLETE',acceptance:'ACCEPTED'});
 assert.equal(result.items.length,2);assert.equal(result.nextCursor,null);assert.equal(calls.length,2);
 for(const q of calls){assert.equal(q.search,undefined);assert.equal(q.statusGroup,'INCOMPLETE');assert.equal(q.acceptance,'ACCEPTED');}
});
test('ordinary task code search remains server side; identity search preserves load more cursor',async()=>{
 const h=harness(),calls=[];h.client.get=async(path,{params})=>{calls.push(params);return {data:{items:[{id:'5ad738f9',taskCode:'REPAIR-X'}],nextCursor:'later',asOf:'now'}};};
 const m=h.load('src/api/crewApi.ts'),signal=new AbortController().signal;
 await m.searchCrewTaskIdentityPage(null,50,signal,{search:'REPAIR-X'});assert.equal(calls[0].search,'REPAIR-X');
 const result=await m.searchCrewTaskIdentityPage(null,50,signal,{search:'5ad738'});assert.equal(result.nextCursor,'later');
});
test('ID scanning stops on cancellation and rejects repeated cursors rather than reporting empty results',async()=>{
 const h=harness();h.client.get=async()=>({data:{items:[],nextCursor:'repeat',asOf:'now'}});
 const m=h.load('src/api/crewApi.ts');await assert.rejects(()=>m.searchCrewTaskIdentityPage(null,50,new AbortController().signal,{search:'5ad738'}),/cursor/);
 const c=new AbortController();c.abort();await assert.rejects(()=>m.searchCrewTaskIdentityPage(null,50,c.signal,{search:'5ad738'}));
});
test('ID search aborts before another page after the session changes',async()=>{
 const h=harness();let reads=0,current=true;
 h.client.get=async()=>{reads++;current=false;return {data:{items:[],nextCursor:'next',asOf:'now'}};};
 const m=h.load('src/api/crewApi.ts');
 await assert.rejects(()=>m.searchCrewTaskIdentityPage(null,50,new AbortController().signal,{search:'5ad738'},{actorId:'actor',assertCurrent(){if(!current)throw Error('session_changed');}}),/session_changed/);
 assert.equal(reads,1);
});
