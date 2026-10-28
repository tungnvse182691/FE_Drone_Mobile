// GET-only resource probes. Auth login is the sole POST; credentials stay in memory.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const base = 'http://127.0.0.1:18081/api/v1';
(async () => {
  const missing = randomUUID();
  for (const suffix of ['', '/coverage']) {
    assert.equal((await fetch(`${base}/datasets/${missing}${suffix}`)).status, 401);
  }
  console.log('API026/API025 anonymous GET: 401');
  const fixture = JSON.parse(execFileSync('docker', ['exec', 'roadguard-fe-starter01-api-1', 'cat', '/handoff/demo-accounts.json'], { encoding: 'utf8' })).find(a => a.key === 'operator-a');
  assert.ok(fixture);
  const auth = await fetch(`${base}/auth/android/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({email:fixture.email,password:fixture.password}) });
  assert.equal(auth.status, 200);
  const pair = await auth.json(), headers = { Authorization: `Bearer ${pair.accessToken}` };
  for (const suffix of ['', '/coverage']) {
    assert.equal((await fetch(`${base}/datasets/${missing}${suffix}`, { headers })).status, 404);
  }
  console.log('API026/API025 authenticated absent resource GET: 404');
  const datasetId = process.env.ROADGUARD_DRONE_DATASET_ID;
  if (!datasetId) {
    console.log('API026/API025 positive: BE_FIXTURE_BLOCKED (no dedicated existing dataset fixture/discovery; no resource mutation)');
    return;
  }
  assert.match(datasetId, /^[0-9a-f-]{36}$/i);
  const read = await fetch(`${base}/datasets/${datasetId}`, { headers });assert.equal(read.status,200);
  const dataset = await read.json();assert.equal(dataset.id,datasetId);assert.equal(dataset.submittedBy,pair.user.id);assert.equal(read.headers.get('etag'),`"${dataset.version}"`);
  const taskResponse = await fetch(`${base}/survey-tasks/${dataset.surveyTaskId}`, {headers});assert.equal(taskResponse.status,200);
  const task = await taskResponse.json();assert.equal(task.operatorId,pair.user.id);assert.equal(task.projectId,dataset.projectId);
  const covered = await fetch(`${base}/datasets/${datasetId}/coverage`, {headers});assert.equal(covered.status,200);
  const coverage=await covered.json();assert.equal(coverage.datasetId,datasetId);assert.ok(Array.isArray(coverage.items));
  console.log('API026/API025 positive GET: HTTP_VERIFIED (authorized source dataset/task/coverage only; no upload/private-byte/native proof)');
})().catch(error => { console.error(`Drone GET smoke failed: ${error.name}`); process.exitCode = 1; });
