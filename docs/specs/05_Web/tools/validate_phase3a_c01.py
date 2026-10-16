#!/usr/bin/env python3
"""Validate Phase 3A C01 screen/API role and Web transport mappings.
Source of truth is the Phase 2C catalog; this validator never grants a role.
"""
from pathlib import Path
import re, json, sys
ROOT=Path(__file__).resolve().parents[4]
WEB=ROOT/'docs/HoangHaiWarrantySystem-Official/05_Web'
CAT=ROOT/'docs/HoangHaiWarrantySystem-Official/04_API-Contracts/02_Full-API-Catalog.md'
WEB_AUTH=(ROOT/'RoadGuardSystem.API/Controllers/WebAuthController.cs').read_text(encoding='utf-8')
WEB_CONFIG=(ROOT/'RoadGuardSystem.API/Authentication/WebCookieConfiguration.cs').read_text(encoding='utf-8')

def fail(msg):
    print('FAIL:',msg); raise SystemExit(1)
text=CAT.read_text(encoding='utf-8')
entries={}
for m in re.finditer(r'^### (API-\d+)\n(.*?)(?=^### API-|\Z)',text,re.M|re.S):
    body=m.group(2); ident=m.group(1)
    route=re.search(r'\*\*`([^`]+)`\*\*',body)
    role=re.search(r'- \*\*Actor/role/scope:\*\* ([^\.\n]+)',body)
    auth=re.search(r'- \*\*Authentication/security declaration:\*\* (.*)',body)
    if not (route and role and auth): fail(f'{ident} missing catalog metadata')
    locator=re.search(r'\[\w+\.(\w+)\]\(\.\./\.\./\.\./(RoadGuardSystem.API/Controllers/[^#]+)#L\d+\)',body)
    if not locator: fail(f'{ident} missing controller action source')
    source=(ROOT/locator.group(2)).read_text(encoding='utf-8')
    declaration=re.search(r'public\s+(?:async\s+)?[\w<>?]+\s+'+re.escape(locator.group(1))+r'\s*\(',source)
    if not declaration: fail(f'{ident} source action missing')
    header=re.split(r'public (?:sealed )?class',source,maxsplit=1)[0]
    attributes=source[:declaration.start()].rsplit('}',1)[-1]
    metadata='WebCookieEligible' in header or 'WebCookieEligible' in attributes
    entries[ident]={'route':route.group(1),'role':role.group(1),'cookie':('Cookie eligibility metadata=true' in auth.group(1) or 'legacy selector=true' in auth.group(1)), 'source_metadata':metadata}

def source_transport(ident, entry):
    """Classify transport from the WebAuth source and cookie selector source."""
    if ident in {'API-013','API-014','API-016'}:
        method={'API-013':'Csrf','API-014':'Login','API-016':'Renew'}[ident]
        if not re.search(r'\[AllowAnonymous\][\s\S]{0,260}public async Task<IActionResult> '+method+r'\b', WEB_AUTH):
            fail(f'{ident} source no longer shows AllowAnonymous {method}')
        return 'ANONYMOUS_BOOTSTRAP'
    if ident in {'API-015','API-017'}:
        method={'API-015':'Logout','API-017':'Session'}[ident]
        if not re.search(r'\[Authorize\(AuthenticationSchemes = WebCookieConfiguration\.Scheme\)\][\s\S]{0,220}public async Task<IActionResult> '+method+r'\b', WEB_AUTH):
            fail(f'{ident} source no longer shows explicit WebCookie scheme {method}')
        return 'WEB_COOKIE_EXPLICIT'
    source_cookie=entry['source_metadata'] or selector_matches(entry['route'])
    if source_cookie != entry['cookie']:
        fail(f'{ident} catalog cookie metadata contradicts controller metadata/method-path selector')
    if source_cookie:
        return 'WEB_COOKIE_SELECTOR'
    return 'BEARER_ONLY'

def selector_matches(route):
    """Mirror the source selector's path/method families for catalog templates."""
    method, path = route.split(' ', 1)
    if path == '/api/v1/me/inspection-tasks': return method == 'GET' and 'inspection-tasks' in WEB_CONFIG
    if path.startswith('/api/v1/notifications'):
        return ('notifications' in WEB_CONFIG and ((method == 'GET') or (method == 'POST' and path.endswith('/read'))))
    if path == '/api/v1/me': return 'path.Equals("/api/v1/me"' in WEB_CONFIG
    families=('/api/v1/profile','/api/v1/auth/change-password','/api/v1/reports','/api/v1/cases')
    if any(path == x or path.startswith(x+'/') for x in families): return 'IsCookieEligiblePath' in WEB_CONFIG
    if '/candidate-decisions' in path or '/candidates' in path or '/labels' in path: return 'path.Contains' in WEB_CONFIG
    if '/defects' in path: return 'IsProjectDefectPath' in WEB_CONFIG
    return False
rows=[]; main=[]
for fn,prefix,actor in [('02_Supervisor-Screen-API-Matrix.md','SUP','Supervisor'),('03_PM-Screen-API-Matrix.md','PM','PM')]:
    s=(WEB/fn).read_text(encoding='utf-8')
    before=s.split('## C01 mapping adjudication',1)[0]
    for line in before.splitlines():
        m=re.match(r'\| \*\*('+prefix+r'-\d+)\*\*',line)
        if m:
            for n in re.findall(r'API-(\d+)',line): main.append((m.group(1),'API-'+n.zfill(3),actor))
    section=s.split('## C01 mapping adjudication',1)
    if len(section)!=2: fail(f'{fn} has no C01 table')
    for line in section[1].splitlines():
        m=re.match(r'\| (SUP-\d+|PM-\d+) \| \[(API-\d+)\].*?\| `([^`]+)` \| ([^|]+) \| ([^|]+) \| \*\*([A-Z_]+)\*\* \| (.*) \|',line)
        if m: rows.append((m.group(1),m.group(2),m.group(3).strip(),m.group(4).strip(),m.group(5).strip(),m.group(6),m.group(7).strip(),actor))
if len(set(x[0] for x in rows)) != 23: fail(f'expected 23 screens, got {len(set(x[0] for x in rows))}')
if len(rows) != len(set((x[0],x[1]) for x in rows)): fail('duplicate Screen/API adjudication')
errors=[]
for sid,ident,route,role,transport,status,reason,actor in rows:
    e=entries.get(ident)
    if not e: errors.append(f'{sid}/{ident}: unknown API'); continue
    transport_class=source_transport(ident,e)
    if transport_class=='ANONYMOUS_BOOTSTRAP': expected='ANONYMOUS_BOOTSTRAP'
    elif actor not in e['role'].split(', '): expected='WRONG_ROLE_REMOVED'
    elif transport_class=='BEARER_ONLY': expected='TRANSPORT_BLOCKED'
    else: expected='READY_BY_SOURCE'
    if status != expected: errors.append(f'{sid}/{ident}: {status} expected {expected}')
    if route != e['route']: errors.append(f'{sid}/{ident}: route mismatch')
    if status=='TRANSPORT_BLOCKED' and 'Bearer' not in transport and 'transport' not in reason.lower(): errors.append(f'{sid}/{ident}: blocked without transport reason')
for sid,ident,actor in main:
    e=entries.get(ident)
    if not e: errors.append(f'{sid}/{ident}: unknown API in active matrix'); continue
    if source_transport(ident,e) != 'ANONYMOUS_BOOTSTRAP' and actor not in e['role'].split(', '): errors.append(f'{sid}/{ident}: wrong-role API remains active')
if errors:
    for x in errors: print(x)
    fail(f'{len(errors)} validation errors')
from collections import Counter
c=Counter(x[5] for x in rows)
transport_counts={k:sum(1 for x in rows if (source_transport(x[1],entries[x[1]])==k and (k in {'ANONYMOUS_BOOTSTRAP','WEB_COOKIE_EXPLICIT'} or x[5] in {'READY_BY_SOURCE','TRANSPORT_BLOCKED'}))) for k in ('ANONYMOUS_BOOTSTRAP','WEB_COOKIE_EXPLICIT','WEB_COOKIE_SELECTOR','BEARER_ONLY','SOURCE_UNCERTAIN')}
if source_transport('API-013',entries['API-013']) != 'ANONYMOUS_BOOTSTRAP' or source_transport('API-014',entries['API-014']) != 'ANONYMOUS_BOOTSTRAP' or source_transport('API-016',entries['API-016']) != 'ANONYMOUS_BOOTSTRAP': fail('WebAuth bootstrap regression')
if source_transport('API-015',entries['API-015']) != 'WEB_COOKIE_EXPLICIT' or source_transport('API-017',entries['API-017']) != 'WEB_COOKIE_EXPLICIT': fail('WebAuth explicit-cookie regression')
if source_transport('API-050',entries['API-050']) != 'BEARER_ONLY': fail('Bearer-only regression API-050')
result={'screens':len(set(x[0] for x in rows)),'mappings':len(rows),'valid':c['READY_BY_SOURCE'],'anonymous_bootstrap':transport_counts['ANONYMOUS_BOOTSTRAP'],'web_cookie_explicit':transport_counts['WEB_COOKIE_EXPLICIT'],'web_cookie_selector':transport_counts['WEB_COOKIE_SELECTOR'],'wrong_role':c['WRONG_ROLE_REMOVED'],'transport_blocked':c['TRANSPORT_BLOCKED'],'bearer_only':transport_counts['BEARER_ONLY'],'source_uncertain':transport_counts['SOURCE_UNCERTAIN'],'active_mappings':len(main)}
print(json.dumps(result,ensure_ascii=False))
if '--self-test' in sys.argv:
    import contextlib, io
    for ident in ('API-050','API-078'):
        contradicted=dict(entries[ident],cookie=not entries[ident]['cookie'])
        rejected=False
        with contextlib.redirect_stdout(io.StringIO()):
            try: source_transport(ident,contradicted)
            except SystemExit as ex: rejected=ex.code==1
        if not rejected: fail(f'{ident} metadata contradiction regression was accepted')
    print('PASS: Bearer-only and metadata-cookie catalog contradictions rejected; WebAuth bootstrap/explicit regressions checked')
print('PASS: catalog IDs, actor authorization, cookie eligibility, route equality and active-matrix role safety')
