const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const id=n=>`${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`;
function fixture(role='REPAIR_CREW'){
 let actor=id(1),session='session',environment='fixture',respond;const listeners=new Set(),calls=[];
 const detail={id:id(2),message:'Misleading task '+id(99),resourceId:id(99),read:false,occurredAt:'2026-11-22T00:00:00Z',version:'v1'};
 const scope={notificationId:id(2),projectId:id(3),occurrenceId:id(4),classification:'CURRENT',sourceKind:'RepairWork',sourceId:id(5),eventType:'hash-not-navigation',resolverVersion:'v1',eventCode:'repair.work.assigned.v1',taskId:id(6),taskProjectId:id(3)};
 respond=async path=>({data:path.endsWith('/scope')?scope:path.includes('?')?{items:[detail],nextCursor:null,asOf:detail.occurredAt}:detail,headers:{etag:'"v1"'}});
 const auth={getState:()=>({user:{id:actor,role_code:role},status:'AUTHENTICATED',token:session}),subscribe:f=>{listeners.add(f);return()=>listeners.delete(f);}};
 const client={defaults:{get baseURL(){return environment;}},get:async path=>{calls.push(path);return respond(path);},post(){throw Error('unexpected mutation');}};
 const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/notificationsApi.ts','utf8'),{compilerOptions:{module:1}}).outputText,{module:m,exports:m.exports,require:n=>n==='./client'?{apiClient:client}:n==='../store/auth'?{useAuthStore:auth}:n==='./authApi'?{passwordSessionIdentity:()=>JSON.stringify([actor,session])}:n==='./droneDatasetWorkflow'?{isDroneResourceId:v=>typeof v==='string'&&/^[0-9a-f-]{36}$/i.test(v)}:{}});
 return {...m.exports,scope,detail,calls,listeners,respond:f=>respond=f,bounce:()=>{actor=id(99);listeners.forEach(f=>f());actor=id(1);},environment:()=>environment='changed'};
}
test('FE4 reads notifications and fresh verified RepairWork target uses task IDs, never resourceId/item/message',async()=>{
 const h=fixture();const page=await h.listNotifications(null,25);assert.equal(page.items.length,1);
 const target=await h.readNotificationTarget(id(2));assert.equal(target.kind,'crew-task');assert.equal(target.taskId,id(6));assert.equal(target.projectId,id(3));
 assert.ok(h.calls.includes(`/notifications/${id(2)}/scope`));assert.equal(h.listeners.size,0);
});
test('FE4 exact assessment scope, unknown code and mismatched lineage fail closed',async()=>{
 const h=fixture('DRONE_OPERATOR');Object.assign(h.scope,{sourceKind:'SurveyTask',sourceId:id(6),eventCode:'survey.dataset.assessed.v1',datasetId:id(7),assessmentId:id(8)});
 const target=await h.readNotificationTarget(id(2));assert.equal(target.assessmentId,id(8));assert.equal(target.datasetId,id(7));
 h.scope.assessmentId=null;assert.equal(await h.readNotificationTarget(id(2)),null);
 h.scope.eventCode='future.event';assert.equal(await h.readNotificationTarget(id(2)),null);
 h.scope.notificationId=id(99);await assert.rejects(h.readNotificationTarget(id(2)));
});
test('FE4 revoked source propagates 403/404 without cached route; actor ABA and env switch rejected',async()=>{
 for(const mode of [403,404,'bounce','env']){
  const h=fixture();h.respond(async path=>{if(path.endsWith('/scope')){if(typeof mode==='number')throw {response:{status:mode}};if(mode==='bounce')h.bounce();else h.environment();return {data:h.scope};}return {data:h.detail,headers:{etag:'"v1"'}};});
  await assert.rejects(h.readNotificationTarget(id(2)));assert.equal(h.listeners.size,0);
 }
});
test('FE4 invalid ETag/query/role fail closed and mark-read has zero network capability',async()=>{
 const h=fixture();h.respond(async()=>({data:h.detail,headers:{etag:'W/"v1"'}}));await assert.rejects(h.readNotificationTarget(id(2)));
 await assert.rejects(h.listNotifications(null,101));await assert.rejects(fixture('REPORTER').listNotifications());
 assert.equal(h.notificationMarkReadCapability.enabled,false);assert.equal(typeof h.markNotificationRead,'undefined');
 assert.ok(!fs.readFileSync('src/api/notificationsApi.ts','utf8').includes('apiClient.post'));
});
