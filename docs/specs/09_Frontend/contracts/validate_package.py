"""Offline structural/fixture checks for this documentation package.
Not a full OpenAPI or JSON Schema standards validator. No network required.
Requires PyYAML; run from any working directory.
"""
from pathlib import Path
import json,re,uuid,datetime,hashlib
import yaml
C=Path(__file__).resolve().parent
R=C.parent.parent
from check_contracts import check
check(R)
api=yaml.safe_load((C/'openapi.baseline.yaml').read_text(encoding='utf-8'))
bundle=json.loads((C/'api.schemas.json').read_text(encoding='utf-8'))
def rev(x):
 if isinstance(x,dict):return {k:rev(v) for k,v in x.items()}
 if isinstance(x,list):return [rev(v) for v in x]
 if isinstance(x,str):return x.replace('#/$defs/','#/components/schemas/')
 return x
assert rev(bundle['$defs'])==api['components']['schemas'],'Schema projection changed constraints'
refs=[]
def checkrefs(x,root):
 if isinstance(x,dict):
  if '$ref' in x:
   ref=x['$ref']; assert ref.startswith('#/'),'Unexpected external ref'
   v=root
   for k in ref[2:].split('/'):v=v[k.replace('~1','/').replace('~0','~')]
   refs.append(ref)
  for v in x.values():checkrefs(v,root)
 elif isinstance(x,list):
  for v in x:checkrefs(v,root)
checkrefs(bundle,bundle)
# Small validator for fixture coverage, not full Draft2020-12 compliance.
def valid(s,v):
 if s is True:return True
 if s is False:return False
 if '$ref' in s:return valid(bundle['$defs'][s['$ref'].split('/')[-1]],v)
 if 'oneOf' in s and sum(valid(b,v) for b in s['oneOf'])!=1:return False
 if 'anyOf' in s and not any(valid(b,v) for b in s['anyOf']):return False
 if 'not' in s and valid(s['not'],v):return False
 if 'enum' in s and v not in s['enum']:return False
 if 'const' in s and v!=s['const']:return False
 t=s.get('type')
 kinds={'object':lambda:isinstance(v,dict),'array':lambda:isinstance(v,list),'string':lambda:isinstance(v,str),'integer':lambda:type(v)is int,'number':lambda:type(v)in(int,float),'null':lambda:v is None,'boolean':lambda:type(v)is bool}
 if t and not kinds[t]():return False
 if isinstance(v,dict):
  if not all(k in v for k in s.get('required',[])):return False
  props=s.get('properties',{})
  if s.get('additionalProperties') is False and set(v)-set(props):return False
  if any(not valid(props[k],w) for k,w in v.items() if k in props):return False
 if isinstance(v,list):
  if len(v)<s.get('minItems',0) or len(v)>s.get('maxItems',float('inf')):return False
  if s.get('uniqueItems') and len({json.dumps(i,sort_keys=True) for i in v})!=len(v):return False
  pre=s.get('prefixItems',[])
  if any(not valid(pre[i] if i<len(pre) else s.get('items',True),w) for i,w in enumerate(v)):return False
 if isinstance(v,str):
  if len(v)<s.get('minLength',0):return False
  if 'pattern' in s and re.search(s['pattern'],v) is None:return False
  try:
   if s.get('format')=='uuid':uuid.UUID(v)
   if s.get('format')=='date-time':
    dt=datetime.datetime.fromisoformat(v.replace('Z','+00:00'));assert dt.tzinfo
   if s.get('format')=='email':assert re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$',v)
  except (ValueError,AssertionError):return False
 if type(v)in(int,float):
  if v<s.get('minimum',-float('inf')) or v>s.get('maximum',float('inf')):return False
  if 'exclusiveMinimum' in s and v<=s['exclusiveMinimum']:return False
 return True
fixtures=json.loads((C.parent/'fixtures/api.examples.json').read_text(encoding='utf-8'))['cases']
for f in fixtures:assert valid(bundle['$defs'][f['schema']],f['value'])==f['expectedValid'],f['name']
ops=[(p,m,o) for p,obj in api['paths'].items() for m,o in obj.items() if m in ['get','post','put','patch','delete']]
assert len({o['operationId'] for _,_,o in ops})==len(ops)
assert len(re.findall(r'^export type \w+ =', (C/'api.types.ts').read_text(encoding='utf-8'),re.M))==len(bundle['$defs'])
links=0
for f in R.rglob('*.md'):
 s=f.read_text(encoding='utf-8');assert len(re.findall(r'^```',s,re.M))%2==0,str(f)+' unbalanced fences'
 for link in re.findall(r'\]\(([^)]+)\)',s):
  if '://' in link or link.startswith('#'):continue
  path=link.split('#')[0]; assert (f.parent/path).exists(),str(f)+' -> '+link
  links+=1
case_text=(C.parent/'11_FE_Offline_Test_UAT.md').read_text(encoding='utf-8')
case_ids=re.findall(r'^\| (TC-FE-\d+) \|',case_text,re.M)
assert len(case_ids)==58 and len(set(case_ids))==58
uat_ids=re.findall(r'^\| (UAT-FE-\d+) \|',case_text,re.M)
assert len(uat_ids)==8
gaps=re.findall(r'^\| (FE-GAP-\d+) \|',(C.parent/'12_Decisions_Contract_Gaps.md').read_text(encoding='utf-8'),re.M)
assert len(gaps)==16
r={'schema_definitions':len(bundle['$defs']),'operations':len(ops),'schema_refs_resolved':len(refs),'positive_fixtures':sum(f['expectedValid'] for f in fixtures),'negative_fixtures':sum(not f['expectedValid'] for f in fixtures),'test_cases_designed':len(case_ids),'uat_designed':len(uat_ids),'gaps':len(gaps),'markdown_links_checked':links,'baseline_sha256':hashlib.sha256((C/'openapi.baseline.yaml').read_bytes()).hexdigest(),'status':'STRUCTURAL_CHECKS_PASS','not_run':['Full OpenAPI/JSON Schema standards validator','TypeScript compiler','Mermaid renderer','Application build','Live API/provider tests','Device/browser E2E','Performance/UAT']}
print(json.dumps(r,ensure_ascii=False,indent=2))
