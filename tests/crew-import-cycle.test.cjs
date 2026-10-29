const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
function graph(entry){
 const edges=new Map();
 function visit(file){
  if(edges.has(file))return;
  const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText;
  const deps=[...js.matchAll(/require\(["']([^"']+)["']\)/g)].map(m=>m[1]).filter(p=>p.startsWith('.')).map(p=>{
   const base=path.resolve(path.dirname(file),p);
   return [base+'.ts',base+'.tsx',path.join(base,'index.ts')].find(p=>fs.existsSync(p));
  }).filter(Boolean);
  edges.set(file,deps);deps.forEach(visit);
 }
 visit(path.resolve(entry));return edges;
}
test('Crew FIELD/repair runtime import graph has no path back to FIELD from workflow',()=>{
 const entry=path.resolve('src/api/crewRepairWorkflow.ts'),target=path.resolve('src/api/crewFieldDraft.ts');
 const edges=graph(entry),seen=new Set();
 function reaches(from,to){if(from===to)return true;if(seen.has(from))return false;seen.add(from);return (edges.get(from)??[]).some(p=>reaches(p,to));}
 assert.equal(reaches(entry,target),true,'workflow must retain FIELD readback');seen.clear();
 assert.equal(reaches(target,entry),false,'FIELD must not import workflow directly or transitively');
});
test('Crew shared history module contains no runtime FIELD dependency',()=>{
 const edges=graph('src/api/crewRepairHistory.ts');
 assert.equal([...edges.keys()].some(p=>p.endsWith('crewFieldDraft.ts')||p.endsWith('crewRepairWorkflow.ts')),false);
});
