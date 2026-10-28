// No dependencies downloaded, emulator launched, or workflow mutations invoked.
const fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {reporterReadStatus}=require('./evidence.cjs');
const root=path.resolve(__dirname,'../..');
const unknown=process.argv.slice(2).filter(a=>a!=='--http-read');
if(unknown.length)throw Error('Only --http-read is supported; Android requires a separate approved task.');
fs.mkdirSync(path.join(root,'.cache'),{recursive:true});
const out=fs.mkdtempSync(path.join(root,'.cache/fe-auto-'));
const run=(name,exe,args)=>{
  const r=spawnSync(exe,args,{cwd:root,encoding:'utf8',timeout:300000,maxBuffer:24*1024*1024,windowsHide:true});
  fs.writeFileSync(path.join(out,name+'.log'),(r.stdout??'')+(r.stderr??''));
  return {status:r.status===0?'PASS':'FAIL',exitCode:r.status,log:path.relative(root,path.join(out,name+'.log'))};
};
const files=fs.readdirSync(path.join(root,'tests')).filter(f=>f.endsWith('.test.cjs')).sort().map(f=>'tests/'+f);
const head=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).stdout.trim();
const logic=run('regression',process.execPath,['--test','--test-reporter=tap',...files]);
const tap=fs.readFileSync(path.join(out,'regression.log'),'utf8');
for(const key of ['tests','pass','fail','cancelled','skipped'])logic[key]=Number(tap.match(new RegExp('^# '+key+' (\\d+)$','m'))?.[1]??NaN);
// Also require zero skipped/cancelled and an actual nonempty suite.
if(!['tests','pass','fail','cancelled','skipped'].every(k=>Number.isFinite(logic[k]))||
  !(logic.tests>0)||logic.pass!==logic.tests||logic.fail||logic.cancelled||logic.skipped)logic.status='FAIL';
const typecheck=process.platform==='win32'
  ?run('typecheck',process.env.ComSpec??'cmd.exe',['/d','/s','/c','npm run typecheck'])
  :run('typecheck','npm',['run','typecheck']);
const diff=run('diff-check','git',['diff','--check']);
const evidence={schema:1,createdAt:new Date().toISOString(),baseline:head,node:process.version,
  workingTree:true,logic,typecheck,diff,
  coverage:{auth:'existing T01/T02/client + actual TSX handler tests',
    reporter:'RPT01 ownership, async provenance, RPT02 retention, isolated disk SQLite reopen/exact replay',
    crewDroneOffline:'existing regression suites reused once; no mutation gate opened'},
  native:{status:'NOT_RUN',reason:'No approved Android device/runtime execution; hook harness and Node SQLite are logic evidence only.'},
  http:{status:'NOT_RUN',reason:'Use --http-read for existing Reporter read-only smoke; workflow mutations require private fixtures.'}};
(async()=>{
  if(process.argv.includes('--http-read')){
    try{
      const ready=await fetch('http://127.0.0.1:18081/ready',{signal:AbortSignal.timeout(10000)});
      evidence.http.ready=ready.status;
      if(ready.status!==200)throw Error('not ready');
      evidence.http={...evidence.http,...run('reporter-http-read',process.execPath,['tests/final-reporter-http-smoke.cjs'])};
      const httpLog=fs.readFileSync(path.join(out,'reporter-http-read.log'),'utf8');
      evidence.http.status=reporterReadStatus(httpLog,evidence.http.exitCode);
      evidence.http.scope=evidence.http.status==='PASS'
        ?'Anonymous 401, authenticated list200, absent-resource404 only; login sole POST; no positive evidence/download bytes or workflow mutation proof.'
        :'See read-smoke log; positive resource reads are not certified.';
      delete evidence.http.reason;
    }catch{evidence.http.status='BLOCKED';evidence.http.reason='Candidate3 readiness unavailable; no workflow writes attempted.';}
  }
  fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify(evidence,null,2));
  if([logic,typecheck,diff].some(r=>r.status!=='PASS')||evidence.http.status==='FAIL')process.exitCode=1;
})().catch(()=>{process.exitCode=1;});
