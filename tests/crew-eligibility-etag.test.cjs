const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function wrapper(headers){
 const source=ts.createSourceFile('crewApi.ts',fs.readFileSync('src/api/crewApi.ts','utf8'),ts.ScriptTarget.Latest,true);
 const names=['getRepairEligibilityReal','extractEtagFromResponse'];
 const code=source.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text)).map(n=>n.getText().replace(/^export /,'')).join('\n');
 const data={version:'h4-eligibility-v1-'+ 'a'.repeat(64)};
 return vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText+';getRepairEligibilityReal', {apiClient:{get:async()=>({data,headers})}})('project','package','item');
}
test('API-146 real wrapper preserves quoted HTTP ETag required by eligibility read and start',async()=>{
 const tag='"h4-eligibility-v1-'+ 'a'.repeat(64)+'"';
 for(const key of ['etag','ETag'])assert.equal((await wrapper({[key]:tag})).etag,tag);
});
test('API-146 never substitutes payload version for absent HTTP ETag',async()=>assert.equal((await wrapper({})).etag,''));
test('API-146 leaves weak ETag untrusted for strict caller validation',async()=>assert.equal((await wrapper({etag:'W/"version"'})).etag,'W/"version"'));
