const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const source=fs.readFileSync('app/(crew)/tasks.tsx','utf8');
function helper(name){
 const ast=ts.createSourceFile('tasks.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name.text===name);
 assert.ok(fn,`${name} is exported for presentation tests`);
 const js=ts.transpileModule(fn.getText(ast).replace(/^export /,''),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 return vm.runInNewContext(js+`;${name}`,{Date,Map,Intl});
}
test('deadline groups use Vietnam calendar boundaries and never drop later/invalid deadlines',()=>{
 const group=helper('crewTasksDueGroups');
 const now=Date.parse('2026-11-22T17:30:00Z'); // Monday 00:30 Vietnam
 const tasks=[['past','2026-11-22T16:59:00Z'],['today','2026-11-23T16:59:00Z'],['tomorrow','2026-11-23T17:00:00Z'],['week','2026-11-29T16:59:00Z'],['later','2026-11-29T17:00:00Z'],['invalid','x'],['missing','']].map(([id,due_label])=>({id,due_label}));
 const groups=JSON.parse(JSON.stringify(group(tasks,now)));
 assert.deepEqual(groups.map(g=>g.label),['Quá hạn','Hôm nay','Ngày mai','Tuần này','Sau tuần này','Chưa có hạn']);
 assert.deepEqual(groups.flatMap(g=>g.tasks.map(t=>t.id)),tasks.map(t=>t.id));
 assert.equal(group([{due_label:'2026-11-22T18:00:00Z'}],now)[0].label,'Hôm nay');
});
test('code preview preserves prefix and original code case; only display is shortened',()=>{
 const preview=helper('crewTaskCodePreview');
 assert.equal(preview('FIELD-1a6fd922e0ea47c4b2b9e9866371e07a'),'FIELD-1a6fd922…');
 assert.equal(preview('REPAIR-01234567890123456789'),'REPAIR-01234567…');
 assert.equal(preview('ABC-123'),'ABC-123');
 assert.equal(preview('60a04265-1234-4567-890a-123456789abc'),'60a04265…');
});
