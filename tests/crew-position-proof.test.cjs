const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const moduleScope={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/crew-position-proof.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:moduleScope,exports:moduleScope.exports,require:()=>({isCrewResourceId:v=>typeof v==='string'&&v.startsWith('id-')})});
const {crewPositionSources:sources,chooseCrewPosition:choose}=moduleScope.exports;
const task={id:'id-task',projectId:'id-project',routeVersionId:'id-route',segmentSetId:'id-set',slabId:null,layoutRevisionId:null};
const geometry={taskId:task.id,projectId:task.projectId,routeVersionId:task.routeVersionId,segmentSetId:task.segmentSetId,segments:[{id:'id-segment',fromOffsetMeters:0,toOffsetMeters:100}]};
test('position sources follow pinned slab rather than offering an unusable route checklist',()=>{
 const s=sources({...task,slabId:'slab-A',layoutRevisionId:'id-layout'},geometry);
 assert.equal(s.choices.map(x=>x.value).join(','),'SLAB_MARKINGS_CONFIRMED,UNKNOWN');
 assert.equal(sources({...task,slabId:'slab-A'},geometry).choices.length,1);
});
test('segment checklist requires geometry bound to this exact task and route',()=>{
 assert.ok(sources(task,geometry).choices.some(x=>x.value==='SEGMENT_MARKINGS_CONFIRMED'));
 for(const key of ['taskId','projectId','routeVersionId','segmentSetId'])assert.equal(sources(task,{...geometry,[key]:'other'}).segments.length,0);
 assert.equal(sources(task,{...geometry,segments:[{id:'id-segment',fromOffsetMeters:100,toOffsetMeters:0}]}).segments.length,0);
 assert.equal(sources(task,null).choices.map(x=>x.value).join(','),'ROUTE_CHAINAGE_MARKINGS_CONFIRMED,UNKNOWN');
});
test('position selection pins real task route without inventing an observed offset or slab',()=>{
 const proof=choose(task,'ROUTE_CHAINAGE_MARKINGS_CONFIRMED');
 assert.equal(proof.observedRouteVersionId,task.routeVersionId);assert.equal(proof.observedChainageMeters,undefined);
 assert.equal(choose(task,'SLAB_MARKINGS_CONFIRMED').observedSlabId,undefined);assert.equal(choose(task,'UNKNOWN'),null);
});
