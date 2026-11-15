const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/roadfe-screen.cjs');
test('Crew adapter preserves current and legacy modes without granting repair authority',()=>{
 const api=harness().load('src/api/crewApi.ts');
 for(const mode of ['NORMAL','CONDITIONAL_FT','MEASURE_ONLY','INSPECT_ONLY','INSPECT_AND_REPAIR','FUTURE']){
  const task=api.crewTaskFromWire({id:'task',projectId:'project',crewId:'crew',version:'v',mode,status:'Assigned',defectIds:[]});
  assert.equal(task.rawMode,mode);
  assert.equal(task.task_mode,mode==='FUTURE'?'UNKNOWN':mode);
  assert.ok(api.crewTaskActionBlock(task));
 }
});
test('Crew detail mode supersedes an outdated inbox mode',()=>{
 const api=harness().load('src/api/crewApi.ts');
 const task=api.crewTaskFromWire({id:'task',projectId:'project',crewId:'crew',version:'v1',mode:'MEASURE_ONLY',status:'Assigned',defectIds:[]},{mode:'CONDITIONAL_FT',version:'v2',status:'InProgress'});
 assert.equal(task.rawMode,'CONDITIONAL_FT');assert.equal(task.task_mode,'CONDITIONAL_FT');assert.equal(task.version,'v2');
 assert.ok(api.crewTaskActionBlock(task));
});
