const test = require('node:test');
const assert = require('node:assert/strict');
const {drone, id} = require('./package45-drone.test.cjs');
test('Operator detail rereads real task status on return from upload', async () => {
  let focus, reads = 0;
  const task = {id:id(2), projectId:id(3), operatorId:id(1), status:'ACCEPTED', version:'v1', scope:[]};
  const s = drone('request-detail', {
    getOperatorSurveyTaskDetailReal: async () => { reads++; return {data:{...task},etag:`"${task.version}"`}; },
    getOperatorWorkPackageReal: async () => ({data:{task,geometryRefs:[]}}),
  }, {params:{taskId:task.id}, moduleFactories:{'expo-router':({react,modules}) => ({...modules['expo-router'],
    useFocusEffect: fn => { focus=fn; react.useEffect(fn,[fn]); },
  })}});
  s.render(); await s.flush(); assert.equal(reads,1);
  assert.ok(s.nodes().some(n=>n.props.title==='Gửi dữ liệu khảo sát'));
  assert.equal(typeof focus,'function','returning to a mounted detail must refetch');
  task.status='SUBMITTED'; task.version='v2'; focus(); await s.flush();
  assert.equal(reads,2); assert.match(JSON.stringify(s.nodes()),/Đã nộp/);
  assert.ok(!s.nodes().some(n=>n.props.title==='Gửi dữ liệu khảo sát')); s.unmount();
});

test('Operator supplement task follows an authorized server link and hides the direct action for null', async () => {
  for (const supplementTaskId of [null, id(4)]) {
    const navigation=[];
    const task = {id:id(2),projectId:id(3),operatorId:id(1),status:'SUPPLEMENT_REQUIRED',version:'v2',scope:[],supplementTaskId};
    const s = drone('request-detail', {
      getOperatorSurveyTaskDetailReal: async () => ({data:task,etag:'"v2"'}),
      getOperatorWorkPackageReal: async () => ({data:{task,geometryRefs:[]}}),
    }, {params:{taskId:task.id}, moduleFactories:{'expo-router':({modules})=>({...modules['expo-router'],router:{push:value=>navigation.push(value)}})}});
    s.render(); await s.flush();
    assert.ok(!s.nodes().some(n=>n.props.title==='Gửi dữ liệu khảo sát'));
    const action=s.nodes().find(n=>n.props.title==='Mở nhiệm vụ bổ sung');
    if(supplementTaskId){
      assert.ok(action);action.props.onPress();
      assert.equal(JSON.stringify(navigation.at(-1)),JSON.stringify({pathname:'/(drone)/request-detail',params:{taskId:supplementTaskId}}));
    }else{
      assert.equal(action,undefined);
      assert.ok(!s.nodes().some(n=>n.props.title==='Xem nhiệm vụ được giao'));
      assert.equal(navigation.length,0);
      assert.ok(!JSON.stringify(s.nodes()).includes('Chưa có nhiệm vụ bổ sung'));
    }
    s.unmount();
  }
});
