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
 assert.equal(wait(3660),'1 giờ 1 phút');assert.equal(wait(60),'1 phút');assert.equal(wait((11*24+13)*3600),'11 ngày 13 giờ');
 assert.match(date('2026-11-02T00:05:00Z'),/07:05/);assert.match(date('bad'),/Chưa/);
});
test('Receiving request semantics keep kind, source and server status separate',()=>{
 const kind=fn('app/(crew)/receiving.tsx','kindLabel'),source=fn('app/(crew)/receiving.tsx','sourceKindLabel'),status=fn('app/(crew)/receiving.tsx','ackStateChip'),select=fn('app/(crew)/receiving.tsx','selectReceivingProject');
 assert.equal(kind('CrewSupplement'),'Yêu cầu bổ sung hồ sơ sửa chữa');
 assert.equal(kind('UNKNOWN_KIND'),'Yêu cầu cần tiếp nhận');
 assert.equal(source('RepairReview'),'Lượt sửa đã nộp');assert.equal(source('CrewSupplement'),null);
 const base={acknowledgmentId:null,acknowledgedAt:null,completedAt:null};
 assert.equal(status(base).label,'Chưa xác nhận');
 assert.equal(status({...base,acknowledgmentId:'ack',acknowledgedAt:'2026-11-08T01:00:00Z'}).label,'Đã xác nhận');
 assert.equal(status({...base,completedAt:'2026-11-08T02:00:00Z'}).label,'Đã đóng');
 const one=[{projectId:'p1'}],many=[...one,{projectId:'p2'}];
 assert.equal(select(one,null),'p1');assert.equal(select(one,null,true),null);assert.equal(select(many,'p2'),'p2');assert.equal(select(many,'missing'),null);
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
