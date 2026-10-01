from pathlib import Path
import tempfile,shutil,subprocess,json,yaml,sys
R=Path(__file__).resolve().parents[1];C=R/'09_Frontend/contracts'
results=[]
for mode in ['unchanged','snapshot_only','canonical_only','both_without_lock','missing_snapshot']:
 with tempfile.TemporaryDirectory() as d:
  t=Path(d); c=t/'09_Frontend/contracts';c.mkdir(parents=True);(t/'05_Technical').mkdir()
  for name in ['check_contracts.py','build_contracts.py','contract.lock.json','openapi.baseline.yaml']:shutil.copy2(C/name,c/name)
  shutil.copy2(R/'05_Technical/openapi.yaml',t/'05_Technical/openapi.yaml')
  if mode in ['snapshot_only','both_without_lock']:
   p=c/'openapi.baseline.yaml';p.write_bytes(p.read_bytes()+b'\n')
  if mode in ['canonical_only','both_without_lock']:
   p=t/'05_Technical/openapi.yaml';p.write_bytes(p.read_bytes()+b'\n')
  if mode=='missing_snapshot':(c/'openapi.baseline.yaml').unlink()
  run=subprocess.run([sys.executable,str(c/'check_contracts.py')],capture_output=True,text=True)
  assert run.returncode==(0 if mode=='unchanged' else 1),(mode,run.stderr)
  if mode!='unchanged':
   build=subprocess.run([sys.executable,str(c/'build_contracts.py')],capture_output=True,text=True)
   assert build.returncode!=0 and not (c/'api.types.ts').exists()
  results.append({'test':mode,'result':'PASS','codegen_blocked':mode!='unchanged'})
a=yaml.safe_load((R/'05_Technical/openapi.yaml').read_text(encoding='utf-8'));resp=a['components']['responses']
assert a['paths']['/auth/login']['post']['responses']['401']['$ref'].endswith('/LoginError401')
assert a['paths']['/auth/refresh']['post']['responses']['401']['$ref'].endswith('/RefreshError401')
for name in ['Error401','LoginError401','RefreshError401']:
 r=resp[name];examples=r['content']['application/json']['examples']
 assert set(examples)==set(r['x-error-codes'])
 for code,ex in examples.items():
  assert ex['value']['code']==code and ex['value']['retryable'] is False
  assert (r['x-client-actions'][code]=='SINGLE_FLIGHT_REFRESH_ONCE')==(code=='TOKEN_EXPIRED')
results.append({'test':'auth_response_mapping_and_refresh_allowlist','result':'PASS'})
assert len(a['components']['schemas']['SyncOperation']['oneOf'])==4
assert 'FAST_TRACK_EVALUATE' in str(a['components']['schemas']['SyncOperation'])
results.append({'test':'fast_track_evaluate_contract_is_explicitly_drafted','result':'PASS','runtime_enabled':False})
print(json.dumps(results,indent=2))
