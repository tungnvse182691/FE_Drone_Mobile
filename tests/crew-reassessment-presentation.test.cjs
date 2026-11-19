const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {randomUUID}=require('node:crypto');
const prefix=fs.readFileSync('tests/t06b.test.cjs','utf8').split("test('T06B journal")[0];
const {harness,ids}=new Function('require',prefix+';return {harness,ids}')(require);
function fixture(options){
 const h=harness(options);let draft=h.draft();draft.measurements[0].value=23;
 h.runtime.fieldDraft=async()=>structuredClone(draft);
 return {...h,get raw(){return h.raw;},edit:value=>draft.measurements[0].value=value,current:()=>structuredClone(draft)};
}
async function assess(h){const c=await h.workflow.prepareRepairAssessment(h.identity,h.current(),h.runtime);return h.workflow.dispatchRepair(h.identity,c.key,h.runtime);}
const {screen}=require('./helpers/roadfe-screen.cjs');
for(const changed of [false,true])test('mounted progress '+(changed?'exposes revised assessment and blocks stale start':'keeps unchanged READY start'),async()=>{
 const h=fixture();try{const row=await assess(h);if(changed)h.edit(2);
 const journal=new Function('require',prefix+';return load("src/api/crewRepairDraft.ts");')(require);
 const s=screen('app/(crew)/wo-detail.tsx',{exportName:'NormalRepairBootstrap',props:{task:{id:h.identity.taskId,projectId:h.identity.projectId,detail:h.task,etag:'"'+h.task.version+'"'},stage:'progress'},modules:{
  'expo-crypto':{randomUUID},'../../src/offline/database':{},
  '../../src/components/crew/CrewTaskFacts':{CrewTaskFacts:'CrewTaskFacts'},
  '../../src/api/crewRepairDraft':{...journal,currentRepairIdentity:()=>h.identity},
  '../../src/api/crewRepairWorkflow':{...h.workflow,readRepairHistory:async()=>[row],readRepairFieldDraft:async()=>h.current()},
  '../../src/hooks/useRepairBootstrap':{useRepairBootstrap:()=>({status:'ready',repairContext:h.task.repairContext,reload:async()=>{}})},
  './tasks':{useCrewIdentity:()=>({scope:h.identity.scope,user:{id:h.identity.actor}})},
  '../../src/api/crewApi':h.api,'../../src/components/Card':{Card:'Card'},'../../src/components/Chip':{Chip:'Chip'},'../../src/components/AppHeader':{AppHeader:'AppHeader'},'../../src/api/crewFieldDraft':{},
 }});s.render();await s.flush();
 const buttons=s.nodes().filter(n=>n.type==='Button');
 assert.equal(buttons.some(n=>n.props.title==='Gửi lại đánh giá trước sửa'&&!n.props.disabled),changed);
 assert.equal(buttons.some(n=>n.props.title==='Bắt đầu thi công'&&!n.props.disabled),!changed);assert.equal(h.posts(),1);s.unmount();
 }finally{h.raw.close();}
});
