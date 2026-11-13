const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const scope={require:n=>n==='node:test'?{test(){}}:require(n),structuredClone,setTimeout,clearTimeout,Uint8Array,AbortController,URL};
vm.runInNewContext(fs.readFileSync('tests/t05b.test.cjs','utf8').split("test('T05B initial submission")[0]+';globalThis.fixtures={fieldHarness,measured};',scope);
const {fieldHarness,measured}=scope.fixtures;
for(const [type,name] of [[5,'DepressionLength'],[6,'DepressionWidth']])test(`FIELD supports backend ${name} and preserves it through submit/readback`,async()=>{
 const h=fieldHarness(),m=h.m.measurementTemplate(type,'dimension');
 assert.equal(m?.type,name);assert.equal(m.dimension,'LENGTH');assert.equal(m.unit,'m');
 const d=measured(h);d.measurements.push({...m,value:0,state:'KNOWN',unknownReason:null,instrument:'Thước',method:'Đo trực tiếp'});
 const result=await h.m.submitFieldDraft(d,h.runtime);
 assert.equal(result.command.phase,'confirmed');assert.equal(result.command.body.measurements[1].type,name);
 assert.equal(result.command.body.measurements[1].value,0);
});
test('FIELD unknown measurement types cannot produce a template',()=>{
 const h=fieldHarness();for(const type of [0,7,-1,1.5])assert.equal(h.m.measurementTemplate(type,'x'),null);
});

test('FIELD submits depth, length and width together and preserves mixed units and unknown reason on readback',async()=>{
 const h=fieldHarness(),d=measured(h);
 d.measurements=[
  {...h.m.measurementTemplate(1,'depth'),value:12.5,unit:'mm',state:'KNOWN',unknownReason:null,instrument:'Thước',method:'Đo trực tiếp'},
  {...h.m.measurementTemplate(5,'length'),value:0,unit:'cm',state:'KNOWN',unknownReason:null,instrument:'Thước',method:'Đo trực tiếp'},
  {...h.m.measurementTemplate(6,'width'),value:null,unit:'m',state:'UNKNOWN',unknownReason:'Không tiếp cận an toàn',instrument:'Thước',method:'Đo trực tiếp'},
 ];
 const result=await h.m.submitFieldDraft(d,h.runtime);
 assert.equal(result.command.phase,'confirmed');
 const body=result.command.body.measurements;
 assert.equal(JSON.stringify(body),JSON.stringify(d.measurements));
 assert.equal(new Set(body.map(m=>m.sampleId)).size,3);
 assert.equal(h.calls.filter(c=>c==='submit').length,1);
});
