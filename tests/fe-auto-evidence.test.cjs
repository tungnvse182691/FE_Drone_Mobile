const {test}=require('node:test'),assert=require('node:assert/strict');
const {reporterReadStatus}=require('./automation/evidence.cjs');
const negative=['210','215','217','218'].map(id=>`API${id} anonymous:401`).join('\n');
const positive=negative+'\nAPI215 authorized list:200\n'+['210','217','218'].map(id=>`API${id} authorized absent resource:404`).join('\n');
test('FE-AUTO zero exit with no Reporter fixture stays blocked, never positive HTTP PASS',()=>{
  assert.equal(reporterReadStatus(negative+'\nReporter positive reads: BE_FIXTURE_BLOCKED (no handoff fixture)',0),'BE_FIXTURE_BLOCKED');
});
test('FE-AUTO empty/truncated/negative-only HTTP output cannot certify successful positive reads',()=>{
  for(const log of ['',negative,positive.replace('API215 authorized list:200','API215 authorized list:403')])assert.equal(reporterReadStatus(log,0),'FAIL');
});
test('FE-AUTO all required HTTP markers pass only with successful process exit',()=>{
  assert.equal(reporterReadStatus(positive,0),'PASS');assert.equal(reporterReadStatus(positive,1),'FAIL');assert.equal(reporterReadStatus(positive,null),'FAIL');
});
