const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const id = n => `${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`;
function harness() {
  let identity = 'session-A', actor = id(1), role = 'DRONE_OPERATOR', environment = 'test-A';
  const listeners = new Set();
  const calls = [];
  const scope = {routeVersionId:id(5),segmentSetId:id(6),segmentIds:[id(7)],targetBand:'SURFACE'};
  const task = {id:id(2),operatorId:actor,projectId:id(3),scope:[scope],version:'task-version',status:'SUBMITTED'};
  const dataset = {id:id(4),surveyTaskId:task.id,projectId:task.projectId,dataVersionId:id(4),submittedBy:actor,deviceId:id(9),scope:[scope],sourceFiles:[],pairs:[],integrityStatus:'VERIFIED',telemetryStatus:'PRESENT',version:'dataset-version'};
  const coverage = {datasetId:dataset.id,methodVersion:'assessment-v1',assessmentId:id(8),version:'assessment-version',items:[{scope,positionCoverage:'PASS',qualityCoverage:'PASS',overallCoverage:'PASS',coverageStatus:'PASS',reasons:[]}]};
  let respond = async kind => kind === 'task' ? {data:task,etag:'"task-version"'} : kind === 'dataset' ? {data:dataset,etag:'"dataset-version"'} : coverage;
  const api = {};
  const load = () => {
    const module = {exports:{}};
    vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/droneDatasetWorkflow.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports,require:name=>{
      if(name === './client') return {API_BASE_URL:'configured-default',apiClient:{defaults:{get baseURL(){return environment;}}}};
      if(name === '../store/auth') return {useAuthStore:{getState:()=>({token:identity,status:'AUTHENTICATED',user:{id:actor,role_code:role}}),subscribe:f=>{listeners.add(f);return()=>listeners.delete(f);}}};
      if(name === './authApi') return {passwordSessionIdentity:t=>t ? JSON.stringify([actor,t]) : null};
      if(name === './droneApi') return {
        getOperatorSurveyTaskDetailReal:async()=>{calls.push('task');return respond('task');},
        getOperatorDatasetReal:async()=>{calls.push('dataset');return respond('dataset');},
        getOperatorDatasetCoverageReal:async()=>{calls.push('coverage');return respond('coverage');},
      };
      throw Error(name);
    }});
    Object.assign(api,module.exports);
  };
  load();
  return {api,calls,task,dataset,coverage,respond:f=>respond=f,switchSession:()=>{identity='session-B';listeners.forEach(f=>f());},bounce:()=>{identity='session-B';listeners.forEach(f=>f());identity='session-A';listeners.forEach(f=>f());},switchEnvironment:()=>{environment='test-B';},wrongRole:()=>{role='REPAIR_CREW';},listeners};
}

test('Drone readback invalidates an ABA session bounce and releases its subscription',async()=>{
 const h=harness(),scope=h.api.operatorDatasetScope();
 h.respond(async kind=>{if(kind==='dataset'){h.bounce();return {data:h.dataset,etag:'"dataset-version"'};}return kind==='task'?{data:h.task,etag:'"task-version"'}:h.coverage;});
 await assert.rejects(h.api.readOperatorDatasetReadback(scope,id(4)),/operator_session_changed/);
 assert.deepEqual(h.calls,['dataset']);assert.equal(h.listeners.size,0);
});
test('Drone production upload has no fixture device or unjournalled dispatch',()=>{
  const screen=fs.readFileSync('app/(drone)/upload.tsx','utf8');
  assert.ok(!screen.includes('FIXTURE_DRONE_DEVICE_ID'));
  assert.ok(!fs.readFileSync('src/api/droneApi.ts','utf8').includes('FIXTURE_DRONE_DEVICE_ID'));
  assert.ok(!screen.includes('await uploadOperatorFileReal('));
  assert.ok(!screen.includes('await submitOperatorDatasetReal('));
  assert.match(screen,/DRONE_DATASET_BLOCK_REASON/);
});
test('Drone accept/decline use shared durable panel without direct mutation',()=>{
  for(const [file,transport] of [['request-detail.tsx','acceptOperatorSurveyTaskReal'],['request-decline.tsx','declineOperatorSurveyTaskReal']]) {
    const source=fs.readFileSync(`app/(drone)/${file}`,'utf8');
    assert.ok(!source.includes(`await ${transport}(`));
    assert.match(source,/DroneTaskCommandPanel key=\{scope.key\} taskId=\{target\}/);
    assert.doesNotMatch(source,/apiClient\.post|handleAcceptTask|handleSubmit/);
  }
});
test('Drone blocked production action handlers cannot call upload/dataset/accept/decline transport',async()=>{
  for(const [file,handler] of [['upload.tsx','handleStartSubmitDataset']]) {
    const source=fs.readFileSync(`app/(drone)/${file}`,'utf8');
    const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let expression;
    const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(ast)===handler)expression=node.initializer.getText(ast);ts.forEachChild(node,visit);};visit(ast);assert.ok(expression);
    let notices=0,transport=0;
    const context={DRONE_TASK_COMMAND_BLOCK_REASON:'blocked-task',DRONE_DATASET_BLOCK_REASON:'blocked-dataset',setAcceptError:()=>notices++,setToast:()=>notices++,setSubmitError:()=>notices++,acceptOperatorSurveyTaskReal:()=>transport++,declineOperatorSurveyTaskReal:()=>transport++,uploadOperatorFileReal:()=>transport++,submitOperatorDatasetReal:()=>transport++};
    await vm.runInNewContext(`(${expression})()`,context);assert.equal(notices,1);assert.equal(transport,0);
  }
});
test('Drone dataset read validates source and returns independent coverage status',async()=>{
  const h=harness(); const result=await h.api.readOperatorDatasetReadback(h.api.operatorDatasetScope(),id(4));
  assert.equal(result.dataset.id,id(4));assert.equal(result.coverage.items[0].overallCoverage,'PASS');
  assert.deepEqual(h.calls,['dataset','task','coverage','dataset']);
});

test('Drone dataset can cover an authorized subset of the task while coverage must match the dataset',async()=>{
 const h=harness();h.task.scope=[{...h.task.scope[0],segmentIds:[id(7),id(10)]}];
 assert.equal((await h.api.readOperatorDatasetReadback(h.api.operatorDatasetScope(),id(4))).dataset.id,id(4));
 h.dataset.scope=[{...h.dataset.scope[0],segmentIds:[id(99)]}];
 await assert.rejects(h.api.readOperatorDatasetReadback(h.api.operatorDatasetScope(),id(4)),/dataset_task_mismatch/);
});
test('Drone wrong role, missing session and invalid dataset cannot dispatch',async()=>{
  const h=harness(),scope=h.api.operatorDatasetScope();
  await assert.rejects(h.api.readOperatorDatasetReadback(scope,'fake'));assert.equal(h.calls.length,0);
  h.wrongRole();assert.equal(h.api.operatorDatasetScope(),null);
  await assert.rejects(h.api.readOperatorDatasetReadback(scope,id(4)));assert.equal(h.calls.length,0);
});
test('Drone session/environment change across awaits rejects response',async()=>{
  for(const switcher of ['switchSession','switchEnvironment']) {
    const h=harness(),scope=h.api.operatorDatasetScope();h.respond(async()=>{h[switcher]();return {data:h.dataset,etag:'"dataset-version"'};});
    await assert.rejects(h.api.readOperatorDatasetReadback(scope,id(4)));assert.deepEqual(h.calls,['dataset']);
  }
});
test('Drone wrong owner/project/task/version/scope and malformed coverage fail closed',async()=>{
  for(const patch of [{submittedBy:id(99)},{projectId:id(99)},{surveyTaskId:id(99)},{version:''},{scope:[]}]) {
    const h=harness();Object.assign(h.dataset,patch);
    await assert.rejects(h.api.readOperatorDatasetReadback(h.api.operatorDatasetScope(),id(4)));
  }
  for(const patch of [{datasetId:id(99)},{items:[]},{methodVersion:''},{items:[{scope:{routeVersionId:id(99)},overallCoverage:'PASS'}]}]) {
    const h=harness();Object.assign(h.coverage,patch);
    await assert.rejects(h.api.readOperatorDatasetReadback(h.api.operatorDatasetScope(),id(4)));
  }
});
test('Drone refuses mismatched ETags and pinned geometry/segment scope',async()=>{
  for(const change of [h=>{h.task.scope=[{...h.task.scope[0],routeVersionId:id(99)}];},h=>{h.task.operatorId=id(99);},h=>{h.task.projectId=id(99);},h=>{h.coverage.items[0].scope={...h.coverage.items[0].scope,segmentIds:[id(99)]};}]) {
    const h=harness();change(h);await assert.rejects(h.api.readOperatorDatasetReadback(h.api.operatorDatasetScope(),id(4)));
  }
  const h=harness();h.respond(async()=>({data:h.dataset,etag:'"wrong"'}));
  await assert.rejects(h.api.readOperatorDatasetReadback(h.api.operatorDatasetScope(),id(4)));
});
test('Drone HTTP wrappers call exact API026/API025 GET paths without mutation or payload',async()=>{
  const calls=[],module={exports:{}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/droneApi.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports,require:name=>{
    if(name==='./client')return {apiClient:{get:async(...args)=>{calls.push(args);return {data:{version:'v'},headers:{etag:'"v"'}};}}};
    return {};
  }});
  await module.exports.getOperatorDatasetReal(id(4));await module.exports.getOperatorDatasetCoverageReal(id(4));
  assert.deepEqual(calls.map(c=>c[0]),[`/datasets/${id(4)}`,`/datasets/${id(4)}/coverage`]);
  assert.ok(calls.every(c=>c.length===1));
});
test('Drone failed coverage read and changed dataset version never return success',async()=>{
  for(const status of [401,403,404,409,412,428,429,503]) {
    const h=harness();h.respond(async kind=>{if(kind==='coverage')throw {response:{status}};return kind==='task'?{data:h.task,etag:'"task-version"'}:{data:h.dataset,etag:'"dataset-version"'};});
    await assert.rejects(h.api.readOperatorDatasetReadback(h.api.operatorDatasetScope(),id(4)));
  }
  const h=harness();let reads=0;
  h.respond(async kind=>kind==='task'?{data:h.task,etag:'"task-version"'}:kind==='coverage'?h.coverage:{data:{...h.dataset,version:++reads===1?'dataset-version':'changed'},etag:reads===1?'"dataset-version"':'"changed"'});
  await assert.rejects(h.api.readOperatorDatasetReadback(h.api.operatorDatasetScope(),id(4)));
});
