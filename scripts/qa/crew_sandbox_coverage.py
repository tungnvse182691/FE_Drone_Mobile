"""Add uploaded coverage fixtures to the authorized local Crew QA sandbox only.

Does not start/finish repairs, reset data, change clocks, or modify SQL/BE code.
REAL_SOURCE exercises the production admission branch with newly uploaded QA
documents; it is not evidence of real road handover or production authorization.
Requires explicit --apply and an existing task/package/assessment.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

BASE = 'http://127.0.0.1:18181'
CONTAINER = 'roadguard-crew-sandbox-api-1'
PROJECT = '72f84201-c001-4000-8000-000000000001'
TASK = '6b12946c-f0e2-47f9-a4f5-89c0fd4308ba'
REVISION = 'a54c806d3d3e9f58b678af4cae4aced58a506945'


def docker(*args):
    result = subprocess.run(['docker', *args], capture_output=True, check=True, timeout=30)
    return result.stdout.decode().strip()


def verify_target():
    info = json.loads(docker('inspect', CONTAINER))[0]
    labels = info['Config']['Labels']
    if (labels.get('com.docker.compose.project') != 'roadguard-crew-sandbox'
            or labels.get('org.opencontainers.image.revision') != REVISION
            or not info['State']['Running']
            or docker('port', CONTAINER, '8080/tcp') != '127.0.0.1:18181'):
        raise RuntimeError('Sandbox identity/revision/port changed; review before continuing')


def http(method, path, token=None, body=None, headers=None):
    merged = dict(headers or {})
    if token:
        merged['Authorization'] = 'Bearer ' + token
    data = None if body is None else json.dumps(body, separators=(',', ':')).encode()
    if body is not None:
        merged['Content-Type'] = 'application/json'
    req = urllib.request.Request(BASE + path, data=data, headers=merged, method=method)
    try:
        response = urllib.request.urlopen(req, timeout=30)
    except urllib.error.HTTPError as failure:
        response = failure
    with response:
        raw = response.read()
        return response.status, json.loads(raw) if raw else None, dict(response.headers)


def save(path, value):
    temp = path.with_suffix('.tmp')
    with temp.open('w', encoding='utf-8') as stream:
        json.dump(value, stream, indent=2)
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temp, path)


class Journal:
    def __init__(self, folder):
        folder.mkdir(parents=True, exist_ok=True)
        self.path = folder / 'commands.json'
        self.value = json.loads(self.path.read_text()) if self.path.exists() else {
            'environment': BASE, 'revision': REVISION, 'projectId': PROJECT,
            'taskId': TASK, 'steps': {},
        }
        for key, value in [('environment', BASE), ('revision', REVISION),
                           ('projectId', PROJECT), ('taskId', TASK)]:
            if self.value.get(key) != value:
                raise RuntimeError('Journal belongs to another environment/scenario')

    def post(self, name, path, token, actor, body, etag=None, ephemeral=False):
        steps = self.value['steps']
        step = steps.get(name)
        # Existing intent is immutable, including If-Match. Never reconstruct on retry.
        if step is None:
            step = {'actorId': actor, 'method': 'POST', 'path': path, 'body': body,
                    'key': str(uuid.uuid4()), 'etag': etag, 'state': 'UNKNOWN_OUTCOME',
                    'preparedAt': dt.datetime.now(dt.timezone.utc).isoformat()}
            steps[name] = step
            save(self.path, self.value)
        if step['actorId'] != actor or step['path'] != path:
            raise RuntimeError('Journal actor/resource changed')
        if 'status' in step and not ephemeral:
            return step['status'], step['response'], step.get('responseHeaders', {})
        headers = {'Idempotency-Key': step['key']}
        if step['etag']:
            headers['If-Match'] = step['etag']
        status, data, received = http('POST', path, token, step['body'], headers)
        # Part URLs are short-lived credentials: never persist/print them.
        step.update(status=status, state='ACKED' if status < 300 else 'REJECTED')
        if not ephemeral:
            step['response'] = data
            step['responseHeaders'] = {k: v for k, v in received.items()
                                       if k.lower() in ('etag', 'date')}
        save(self.path, self.value)
        if status >= 500:
            step['state'] = 'UNKNOWN_OUTCOME'
            step.pop('status', None)
            save(self.path, self.value)
            raise RuntimeError('Server outcome unknown; preserve journal and replay exact intent')
        return status, data, received


def ok(result, statuses=(200,)):
    status, data, headers = result
    if status not in statuses:
        code = data.get('code') if isinstance(data, dict) else None
        raise RuntimeError(f'HTTP {status}, code={code}; preserve journal')
    return data, headers


def get(path, token):
    return ok(http('GET', path, token))


def pdf(lines):
    """Small valid PDF containing explicit QA purpose and source scope."""
    escaped = [line.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)') for line in lines]
    content = ('BT /F1 11 Tf 40 790 Td ' + ' '.join(f'({s}) Tj 0 -18 Td' for s in escaped) + ' ET').encode('ascii')
    objects = [b'<< /Type /Catalog /Pages 2 0 R >>',
               b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
               b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
               b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
               b'<< /Length ' + str(len(content)).encode() + b' >>\nstream\n' + content + b'\nendstream']
    data, offsets = b'%PDF-1.4\n', [0]
    for i, obj in enumerate(objects, 1):
        offsets.append(len(data))
        data += f'{i} 0 obj\n'.encode() + obj + b'\nendobj\n'
    start = len(data)
    data += b'xref\n0 6\n0000000000 65535 f \n'
    data += b''.join(f'{offset:010d} 00000 n \n'.encode() for offset in offsets[1:])
    return data + f'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{start}\n%%EOF\n'.encode()


def upload(name, content, supervisor, actor, journal):
    digest = hashlib.sha256(content).hexdigest()
    session, _ = ok(journal.post(name + '-create', '/api/v1/uploads', supervisor, actor, {
        'purpose': 'DOCUMENT', 'projectId': PROJECT, 'targetId': PROJECT,
        'fileName': name + '.pdf', 'mediaType': 'application/pdf',
        'sizeBytes': len(content), 'checksumSha256': digest,
    }), (200, 201))
    path = '/api/v1/uploads/' + session['id']
    current, headers = get(path, supervisor)
    if str(current['status']).upper() == 'VERIFIED':
        return current['fileId']
    if len(content) > session['partSizeBytes']:
        raise RuntimeError('Fixture exceeds one part')
    part_key = name + '-part'
    part = journal.value['steps'].get(part_key)
    if not part or 'eTag' not in part:
        urls, _ = ok(journal.post(name + '-urls', path + '/part-urls', supervisor,
                                 actor, {'partNumbers': [1]}, ephemeral=True))
        url = urls['parts'][0]['url']
        # Android host alias is unavailable on Windows. Preserve signed Host/path/query
        # while connecting to the same published local MinIO port.
        parsed = urllib.parse.urlsplit(url)
        if parsed.scheme != 'http' or parsed.hostname not in ('10.0.2.2', '127.0.0.1', 'localhost') or parsed.port != 19101:
            raise RuntimeError('Unexpected object storage endpoint')
        local = urllib.parse.urlunsplit(('http', '127.0.0.1:19101', parsed.path, parsed.query, ''))
        journal.value['steps'][part_key] = {'actorId': actor, 'state': 'UNKNOWN_OUTCOME', 'checksum': digest}
        save(journal.path, journal.value)
        req = urllib.request.Request(local, data=content, method='PUT', headers={'Host': parsed.netloc})
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                part_etag = response.headers['ETag']
        except urllib.error.HTTPError as failure:
            raise RuntimeError(f'Object PUT failed HTTP {failure.code}; URL omitted') from None
        journal.value['steps'][part_key].update(state='ACKED', eTag=part_etag)
        save(journal.path, journal.value)
    part_etag = journal.value['steps'][part_key]['eTag']
    current, headers = get(path, supervisor)
    ok(journal.post(name + '-complete', path + '/complete', supervisor, actor,
                    {'parts': [{'partNumber': 1, 'eTag': part_etag}], 'checksumSha256': digest},
                    headers.get('ETag') or '"' + current['version'] + '"'), (200, 202))
    for _ in range(30):
        current, _ = get(path, supervisor)
        if str(current['status']).upper() == 'VERIFIED':
            return current['fileId']
        if str(current['status']).upper() == 'FAILED':
            raise RuntimeError('Upload verification failed')
        time.sleep(1)
    raise RuntimeError('Upload verification still pending; preserve journal')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--journal-dir', type=Path, default=Path('.cache/crew-coverage-fixture-20261117'))
    args = parser.parse_args()
    verify_target()
    if not args.apply:
        print('Target verified. Use --apply for the explicitly authorized local QA scenario.')
        return
    journal = Journal(args.journal_dir)
    accounts = {a['key']: a for a in json.loads(docker('exec', CONTAINER, 'cat', '/handoff/demo-accounts.json'))}
    tokens, actors = {}, {}
    for role in ('supervisor', 'crew-a', 'pm-a'):
        account = accounts[role]
        password = os.environ.get('ROADGUARD_QA_' + role.upper().replace('-', '_') + '_PASSWORD', account['password'])
        # Login credentials and tokens are deliberately excluded from durable evidence.
        with (args.journal_dir / 'auth.jsonl').open('a') as stream:
            stream.write(json.dumps({'environment': BASE, 'actorKey': role, 'path': '/api/v1/auth/android/login',
                                     'at': dt.datetime.now(dt.timezone.utc).isoformat()}) + '\n')
            stream.flush()
            os.fsync(stream.fileno())
        result, _ = ok(http('POST', '/api/v1/auth/android/login', body={'email': account['email'], 'password': password}))
        tokens[role] = result['accessToken']
        # User id is validated against the read task below; do not derive authority locally.
        import base64
        claim = tokens[role].split('.')[1]
        actors[role] = json.loads(base64.urlsafe_b64decode(claim + '=' * (-len(claim) % 4)))['sub']
    supervisor, crew = tokens['supervisor'], tokens['crew-a']
    root = f'/api/v1/projects/{PROJECT}'
    detail, _ = get(root + '/field-inspection-tasks/' + TASK, crew)
    if detail['assignedToUserId'] != actors['crew-a'] or detail['mode'] != 'CONDITIONAL_FT':
        raise RuntimeError('Task actor/mode changed')
    ctx = detail['repairContext']
    item_path = root + '/repair-packages/' + ctx['packageId'] + '/items/' + ctx['itemId']
    item, _ = get(item_path, tokens['pm-a'])
    view, _ = get(root + '/road-coverage', supervisor)
    scope = next(s for s in view['scopes'] if s['obligationId'] == item['obligationId'])
    if 'scope' not in journal.value:
        journal.value['scope'] = scope
        journal.value['date'] = dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date().isoformat()
        save(journal.path, journal.value)
    if journal.value['scope'] != scope:
        raise RuntimeError('Scope changed; do not reuse fixture')
    day = journal.value['date']
    common = ['ROADGUARD CREW SANDBOX - QA FIXTURE ONLY', 'NOT A REAL ROAD HANDOVER OR PRODUCTION APPROVAL',
              'Project: ' + PROJECT, 'Task: ' + TASK, 'Road: ' + scope['roadSectionId'],
              f"Chainage: {scope['from']} to {scope['to']}; offsets: {scope['offsetFrom']} to {scope['offsetTo']}",
              'QA fixture date: ' + day]
    handover_file = upload('crew-qa-handover', pdf(['QA HANDOVER DOCUMENT', *common]), supervisor, actors['supervisor'], journal)
    basis_file = upload('crew-qa-maintenance', pdf(['QA MAINTENANCE BASIS', *common]), supervisor, actors['supervisor'], journal)
    if handover_file == basis_file:
        raise RuntimeError('Sources must be distinct')
    view, headers = get(root + '/road-coverage', supervisor)
    etag = headers.get('ETag') or '"' + view['version'] + '"'
    attached = next((s for s in view['sources'] if s['kind'] == 'HANDOVER' and s['fileId'] == handover_file), None)
    if not attached:
        result = journal.post('attach-existing', root + '/handover-documents', supervisor, actors['supervisor'], {'fileId': handover_file}, etag)
        if result[0] == 404 and result[1].get('code') == 'handover_document_not_found':
            result = journal.post('create-handover', root + '/handover-documents', supervisor, actors['supervisor'],
                                  {'fileId': handover_file, 'documentNo': 'QA-CREW-20261117', 'handoverDate': day}, etag)
        ok(result)
    view, headers = get(root + '/road-coverage', supervisor)
    handover = next(s for s in view['sources'] if s['kind'] == 'HANDOVER' and s['fileId'] == handover_file)
    basis = next(s for s in view['sources'] if s['kind'] == 'MAINTENANCE_BASIS' and s['id'] == basis_file)
    if handover['provenance'] == 'TEST_ONLY' or basis['provenance'] == 'TEST_ONLY':
        raise RuntimeError('Never relabel a TEST_ONLY source')
    existing = next((h for h in view['history'] if h['scopeObligationId'] == item['obligationId']), None)
    if existing and existing['handoverFileId'] != handover_file:
        raise RuntimeError('Another mapping already owns this scope; do not overwrite')
    if not existing:
        start = dt.datetime.fromisoformat(day).replace(tzinfo=dt.timezone(dt.timedelta(hours=7)))
        ok(journal.post('confirm-coverage', root + '/road-coverage', supervisor, actors['supervisor'], {
            'scopeObligationId': item['obligationId'], 'expectedScopeHash': scope['scopeHash'],
            'handoverDocumentId': handover['id'], 'handoverVersion': handover['version'],
            'sourceKind': 'MAINTENANCE_BASIS', 'sourceId': basis['id'], 'sourceVersion': basis['version'],
            'applicableFromUtc': start.isoformat(), 'applicableToUtc': (start + dt.timedelta(days=7)).isoformat(),
            'provenance': 'REAL_SOURCE',
            'reason': 'Owner-authorized isolated Crew QA fixture. Uploaded QA documents only; no real-world handover or production authorization. Test execution-start for existing task; preserve photos/measurements.',
        }, headers.get('ETag') or '"' + view['version'] + '"'), (200, 201))
    eligibility, _ = get(item_path + '/eligibility', crew)
    after, _ = get(root + '/road-coverage', supervisor)
    report = {'observedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'environment': BASE,
              'revision': REVISION, 'taskId': TASK, 'itemId': item['id'], 'scope': scope,
              'fixtureOnly': True, 'handoverFileId': handover_file, 'basisFileId': basis_file,
              'mappingCount': len(after['history']), 'eligibility': eligibility,
              'executionStart': 'NOT_RUN - use the Android app button'}
    save(args.journal_dir / 'readback.json', report)
    print(json.dumps({'observedAt': report['observedAt'], 'taskId': TASK,
                      'mappingCount': report['mappingCount'],
                      'eligible': eligibility['eligible'],
                      'missingReasons': eligibility['missingReasons'],
                      'evidenceFile': str(args.journal_dir / 'readback.json')}, indent=2))


if __name__ == '__main__':
    main()
