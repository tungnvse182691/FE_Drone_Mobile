const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
function fn(file,name){const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const n=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.ok(n,name);return vm.runInNewContext(ts.transpileModule(n.getText().replace(/^export /,''),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+';'+name);}
test('Crew labels distinguish submission, completion and modes without changing raw input',()=>{
 const status=fn('app/(crew)/tasks.tsx','crewStatusLabel'),mode=fn('app/(crew)/tasks.tsx','crewModeLabel');
 const raw={status:'Submitted',mode:'INSPECT_AND_REPAIR',notes:'Backend FIELD NORMAL — keep original'};const snapshot=JSON.stringify(raw);
 assert.equal(status(raw.status),'Đã gửi hồ sơ');assert.equal(status('Completed'),'Hoàn thành nhiệm vụ');
 assert.equal(mode(raw.mode),'Đo kiểm và xem xét sửa chữa');assert.equal(mode('CONDITIONAL_FT'),'Sửa chữa nhanh có điều kiện');
 for(const v of ['unknown','VERIFIED','PENDING_DEPENDENCY'])assert.doesNotMatch(status(v),/hoàn thành|đã gửi|đã xác nhận/i);
 assert.equal(JSON.stringify(raw),snapshot);
});
test('Crew duration and dates are Vietnamese display only',()=>{
 const wait=fn('app/(crew)/receiving.tsx','formatWaiting'),date=fn('app/(crew)/tasks.tsx','crewDateTime');
 assert.equal(wait(3660),'1 giờ 1 phút');assert.equal(wait(60),'1 phút');
 assert.match(date('2026-11-02T00:05:00Z'),/07:05/);assert.match(date('bad'),/Chưa/);
});
test('Wire instrument gets a display label; arbitrary backend text stays unchanged',()=>{
 const label=fn('app/(crew)/field-review.tsx','crewInstrumentLabel');
 const raw={instrument:'RULER',method:'Backend FIELD method'};
 assert.equal(label(raw.instrument),'Thước đo');assert.equal(raw.instrument,'RULER');assert.equal(label(raw.method),raw.method);
 assert.equal(label(''),'Chưa có thông tin');
});
test('Pending and legacy ACK never acquire a success label',()=>{
 const label=fn('app/(crew)/sync.tsx','crewQueueStateLabel');
 for(const v of ['UNKNOWN_OUTCOME','ACKED','IN_FLIGHT','CONFLICT','PENDING_DEPENDENCY','mystery'])assert.doesNotMatch(label(v),/đã đồng bộ|hoàn thành|thành công/i);
});
