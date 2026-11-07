const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const workflow = fs.readFileSync('src/api/crewRepairWorkflow.ts', 'utf8');
const history = fs.readFileSync('src/api/crewRepairHistory.ts', 'utf8');
const correction = fs.readFileSync('app/(crew)/repair-correction.tsx', 'utf8');
const review = fs.readFileSync('app/(crew)/field-review.tsx', 'utf8');

test('G02B exposes a guarded supplement preparation path from a real FIELD revision', () => {
  assert.match(workflow, /prepareRepairSupplement/);
  assert.match(workflow, /decision!=='SUPPLEMENT'/);
  assert.match(workflow, /parentSubmissionId!==attempt\.effectiveSubmissionId/);
  assert.match(workflow, /supplementRepairAttemptReal/);
  assert.match(workflow, /operation:'supplement'/);
});

test('G02B keeps API-159 immutable and reconciles API-080 before confirming', () => {
  assert.match(workflow, /command\.operation==='supplement'\?r\.api\.supplementRepairAttemptReal/);
  assert.match(workflow, /a\.attemptId!==c\.receipt!\.data\.attemptId/);
  assert.match(workflow, /a\.review!==null/);
  assert.match(history, /c\.operation==='attempt' \|\| c\.operation==='supplement'/);
});

test('G02B UI opens only from SUPPLEMENT and sends through FIELD review', () => {
  assert.match(correction, /canSupplement: true/);
  assert.match(correction, /field-review.*supplement: '1'/s);
  assert.match(review, /prepareRepairSupplement/);
  assert.match(review, /dispatchRepair/);
  assert.match(review, /Gửi bản bổ sung và liên kết lượt sửa chữa/);
});

test('G02B never enables FastTrack mutation', () => {
  assert.match(workflow, /repair_fasttrack_mutation_disabled/);
  assert.match(workflow, /task\.mode==='CONDITIONAL_FT'/);
});
