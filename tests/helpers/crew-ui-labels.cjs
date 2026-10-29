const fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm'),path=require('node:path');
const file=path.join(__dirname,'../../app/(crew)/tasks.tsx');
const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
for(const name of ['crewStatusLabel','crewModeLabel']){const node=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);if(!node)throw Error('Missing '+name);const code=ts.transpileModule(node.getText().replace(/^export /,''),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;exports[name]=vm.runInNewContext(code+';'+name);}
