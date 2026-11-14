const {test}=require('node:test'),assert=require('node:assert/strict');
const {drone,id,task}=require('./package45-drone.test.cjs');
const {harness}=require('./helpers/roadfe-screen.cjs');
const ref={routeVersionId:id(4),segmentSetId:id(5),segmentIds:[id(6)]};
const shape=coordinates=>({type:'LineString',coordinates});
const gp={projectId:task.projectId,route:{routeVersionId:id(4),versionNo:4},segmentSet:{id:id(5),routeVersionId:id(4),segments:[
 {id:id(6),sequence:1,wgs84Geometry:shape([[106,10],[106.01,10]])},
 {id:id(7),sequence:2,wgs84Geometry:shape([[107,11],[107.01,11]])}
]}};
test('Operator map limits geometry to assigned segments and rejects metric fallback or broken lines',()=>{
 const m=harness().load('src/api/operatorMapGeometry.ts');
 const scoped=m.operatorMapSegments(ref,gp);
 assert.equal(scoped.length,1);assert.equal(scoped[0].id,id(6));assert.equal(JSON.stringify(scoped[0].coordinates),'[[106,10],[106.01,10]]');
 for(const bad of [null,shape([[500000,1100000],[500100,1100000]]),shape([[106,10],[NaN,11],[106.02,10]]),{geometryType:'LineString',coordinates:[[106,10],[107,10]]}]){
  const copy=structuredClone(gp);copy.segmentSet.segments[0].wgs84Geometry=bad;copy.segmentSet.segments[0].metricGeometry=shape([[106,10],[107,10]]);
  assert.equal(m.operatorMapSegments(ref,copy)[0].coordinates.length,0);
 }
 const copy=structuredClone(gp);copy.segmentSet.routeVersionId=id(99);
 assert.throws(()=>m.operatorMapSegments(ref,copy),/geometry_source_mismatch/);
});
test('Operator dedicated map reads every pinned ref and switches only assigned segments',async()=>{
 const calls=[];const second={routeVersionId:id(8),segmentSetId:id(9),segmentIds:[id(10)]};
 const gp2={...gp,route:{routeVersionId:id(8),versionNo:8},segmentSet:{...gp.segmentSet,id:id(9),routeVersionId:id(8),segments:[{id:id(10),sequence:3,wgs84Geometry:shape([[108,10],[108.01,10]])}]}};
 const s=drone('survey-map',{getOperatorWorkPackageReal:async()=>({data:{task,geometryRefs:[ref,second]}}),getOperatorGeometryPackageReal:async(p,r)=>{calls.push(r.routeVersionId);return {data:r.routeVersionId===id(4)?gp:gp2};}},
  {params:{taskId:task.id},modules:{'../../src/components/map/RoadGuardMapLibre':{RoadGuardMapLibre:'RoadGuardMapLibre'}}});
 const text=()=>JSON.stringify(s.nodes());
 s.render();await s.flush();assert.deepEqual(calls,[id(4),id(8)]);
 let map=s.nodes().find(n=>n.type==='RoadGuardMapLibre');assert.ok(map);assert.equal(JSON.stringify(map.props.routeCoordinates),'[[106,10],[106.01,10]]');
 assert.ok(!s.nodes().some(n=>n.type==='SafeAreaScreen'), 'map must not sit in the work package scroll view');
 await s.tap('map-segment-'+id(10));await s.flush();map=s.nodes().find(n=>n.type==='RoadGuardMapLibre');assert.equal(JSON.stringify(map.props.routeCoordinates),'[[108,10],[108.01,10]]');
 s.h.changeAuth({status:'SIGNED_OUT',user:null,token:null});s.render();await s.flush();assert.ok(!s.nodes().some(n=>n.type==='RoadGuardMapLibre'));s.unmount();
});

test('Work package opens a dedicated map instead of embedding gesture content',async()=>{
 const nav=[];
 const s=drone('work-package',{getOperatorWorkPackageReal:async()=>({data:{task,geometryRefs:[ref]}}),getOperatorGeometryPackageReal:async()=>({data:gp})},
 {params:{taskId:task.id},modules:{'expo-router':{router:{push:p=>nav.push(p)},useLocalSearchParams:()=>({taskId:task.id})}}});
 s.render();await s.flush();assert.ok(!s.nodes().some(n=>n.type==='RoadGuardMapLibre'));
 await s.tap('open-survey-map');assert.equal(nav[0].pathname,'/(drone)/survey-map');assert.equal(nav[0].params.taskId,task.id);s.unmount();
});

test('Map can focus a server-provided access point and return to the pinned line',async()=>{
 const s=drone('survey-map',{getOperatorWorkPackageReal:async()=>({data:{task,geometryRefs:[ref],accessPoint:{point:{longitude:108.33333333333333,latitude:15.883333333333333}}}}),getOperatorGeometryPackageReal:async()=>({data:gp})},{params:{taskId:task.id}});
 s.render();await s.flush();await s.tap('focus-map-access');await s.flush();
 let map=s.nodes().find(n=>n.type==='RoadGuardMapLibre');assert.equal(JSON.stringify(map.props.center),'[108.33333333333333,15.883333333333333]');assert.equal(map.props.routeCoordinates.length,0);
 await s.tap('map-segment-'+id(6));await s.flush();map=s.nodes().find(n=>n.type==='RoadGuardMapLibre');assert.equal(map.props.routeCoordinates.length,2);s.unmount();
});
