"""Create ten isolated submitted Operator tasks via the local sandbox APIs.

Requires an explicitly supplied synthetic QA MP4. No SQL writes, BE edits,
historical-task mutations or signed URLs in the durable journal/output.
UNKNOWN_OUTCOME stops for reconciliation; this script never blindly retries it.
"""
import argparse
import hashlib
import importlib.util
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib import request, parse
from uuid import uuid4
import json
import time


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backend', type=Path, default=Path('D:/Do_AN_Drone/RoadGuardSystem-develop'))
    parser.add_argument('--video', type=Path, required=True)
    parser.add_argument('--journal', type=Path, default=Path('.cache/operator-submitted-qa.json'))
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location('seed', args.backend / 'deploy/fe-handoff/operator_sandbox_seed.py')
    seed = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(seed)
    for container in seed.CONTAINERS:
        assert seed.command(['docker', 'inspect', '--format', '{{ index .Config.Labels "com.docker.compose.project" }}', container]) == 'roadguard-crew-sandbox'
        assert seed.command(['docker', 'inspect', '--format', '{{.State.Running}}', container]) == 'true'
    assert seed.BASE == 'http://127.0.0.1:18181'
    assert seed.command(['docker', 'port', seed.API_CONTAINER, '8080/tcp']) == '127.0.0.1:18181'
    assert seed.command(['docker', 'exec', seed.API_CONTAINER, 'printenv', 'MinioStorage__PublicEndpoint']) == 'http://10.0.2.2:19101'
    assert seed.http('GET', '/minio/health/live', base='http://127.0.0.1:19101')[0] == 200
    database = seed.database_name()
    credentials = seed.accounts()
    sessions = {actor: seed.login(credentials[actor]) for actor in ['pm-a', 'operator-a']}
    tokens = {actor: session[0] for actor, session in sessions.items()}
    actors = {actor: session[1] for actor, session in sessions.items()}
    assert all(actors.values())
    status, source, _ = seed.task_detail('25324063-5559-4c70-9283-d0ec321e09d6', tokens['operator-a'])
    assert status == 200 and source['status'] == 'SUBMITTED'
    payload = args.video.read_bytes()
    assert 0 < len(payload) <= 8 * 1024 * 1024 and b'ftyp' in payload[:32]
    digest = hashlib.sha256(payload).hexdigest()
    journal = seed.Journal(args.journal)
    identity = dict(database=database, actors=actors, videoSha256=digest, sourceTask=source['id'])
    if 'identity' in journal.data:
        assert journal.data['identity'] == identity
    else:
        journal.data['identity'] = identity
        journal.data['recordedAt'] = datetime.fromtimestamp(args.video.stat().st_mtime, timezone.utc).isoformat()
        journal.data['provenance'] = 'SYNTHETIC_QA_MP4; recordedAt=file modification time; no telemetry/GPS'
    if not args.apply:
        print(json.dumps(dict(target=seed.PROJECT, create=10, videoBytes=len(payload), sha256=digest)))
        return
    journal.save()

    def get(path, actor='operator-a'):
        code, body, _ = seed.http('GET', path, tokens[actor])
        assert code == 200 and isinstance(body, dict), f'readback HTTP {code}'
        return body

    def post(key, path, body, actor='operator-a', etag=None, ephemeral=False):
        headers = {'Idempotency-Key': str(uuid4())}
        if etag:
            headers['If-Match'] = etag
        saved = journal.data['steps'].get(key)
        if saved:
            assert (saved['path'], saved['body'], saved['actor']) == (path, body, actor)
            if saved['state'] == 'ACKED' and not ephemeral:
                return saved['result']
            # URL admission may be replayed using exactly the original command;
            # other unknown mutations require explicit readback reconciliation.
            if saved['state'] != 'ACKED':
                raise RuntimeError(f'{key}: retained {saved["state"]}; reconcile before retry')
        else:
            saved = dict(path=path, method='POST', body=body, actor=actor, actorId=actors[actor], headers=headers, state='INTENT')
            journal.data['steps'][key] = saved
            journal.save()
        saved['state'] = 'UNKNOWN_OUTCOME'
        journal.save()
        code, result, _ = seed.http('POST', path, tokens[actor], saved['body'], saved['headers'])
        expected = (200, 202) if path.endswith('/complete') else (200, 201)
        if code not in expected or not isinstance(result, dict):
            saved.update(state='BLOCKED', httpStatus=code, problemCode=result.get('code') if isinstance(result, dict) else None)
            journal.save()
            raise RuntimeError(f'{key}: HTTP {code}; stopped')
        saved.update(state='ACKED', httpStatus=code)
        if not ephemeral:
            saved['result'] = result
        journal.save()
        return result

    for index in range(1, 11):
        key = f'QA-OP-SUBMITTED-{index:02}'
        saved = journal.data['steps'].get(key)
        fields = ('actor', 'actorId', 'method', 'path', 'body', 'headers', 'beforeIds', 'operator', 'projectId')
        intent = {field: saved[field] for field in fields} if saved else seed.new_intent(key, 'pm-a', 'operator-a', {'operator-a': source}, tokens, actors)
        task = seed.execute_step(journal, key, intent,
            lambda step: seed.reconcile_create(step, tokens),
            lambda step: seed.http('POST', step['path'], tokens['pm-a'], step['body'], step['headers']))
        tid = task['id']
        route = f'/api/v1/survey-tasks/{tid}'
        current = get(route)
        assert current['id'] == tid and current['projectId'] == source['projectId']
        assert current['operatorId'] == actors['operator-a']
        if key + '-dataset' not in journal.data['steps']:
            accepted = post(key + '-accept', route + '/accept', None, etag='"' + task['version'] + '"')
            upload = post(key + '-upload', '/api/v1/uploads', dict(purpose='SURVEY_VIDEO', projectId=source['projectId'], targetId=tid,
                fileName=key + '-SYNTHETIC.mp4', mediaType='video/mp4', sizeBytes=len(payload), checksumSha256=digest))
            upload_route = '/api/v1/uploads/' + upload['id']
            assert upload['partSizeBytes'] >= len(payload)
            complete_step = journal.data['steps'].get(key + '-complete')
            if complete_step and complete_step['state'] != 'ACKED':
                # A prior script version classified the legitimate 202 as blocked.
                # Reconcile that exact own upload through independent GETs.
                assert complete_step['state'] == 'BLOCKED' and complete_step['httpStatus'] == 202
                session = get(upload_route)
                metadata = get('/api/v1/files/' + upload['fileId'])
                assert session['id'] == upload['id'] and session['fileId'] == metadata['id'] == upload['fileId']
                assert session['status'] == metadata['status'] == 'VERIFIED'
                assert metadata['checksumSha256'] == digest and metadata['sizeBytes'] == len(payload)
                complete_step.update(state='ACKED', result=session, reconciledBy='GET upload + GET file metadata')
                journal.save()
            if key + '-complete' not in journal.data['steps']:
                urls = post(key + '-part-urls', upload_route + '/part-urls', {'partNumbers': [1]}, ephemeral=True)
                signed = parse.urlsplit(urls['parts'][0]['url'])
                assert signed.scheme == 'http' and signed.hostname == '10.0.2.2' and signed.port == 19101
                # Keep the signed Host unchanged while reaching the local Docker port.
                local = parse.urlunsplit(('http', '127.0.0.1:19101', signed.path, signed.query, ''))
                put = request.Request(local, data=payload, method='PUT', headers={'Host': signed.netloc, 'Content-Type': 'video/mp4'})
                with request.urlopen(put, timeout=30) as response:
                    assert response.status == 200
                    part_etag = response.headers['ETag']
                upload_current = get(upload_route)
                post(key + '-complete', upload_route + '/complete', {'parts': [{'partNumber': 1, 'etag': part_etag}], 'checksumSha256': digest}, etag='"' + upload_current['version'] + '"')
            for attempt in range(30):
                metadata = get('/api/v1/files/' + upload['fileId'])
                if metadata['status'] == 'VERIFIED':
                    break
                assert metadata['status'] != 'FAILED', 'synthetic QA upload rejected'
                time.sleep(1)
            assert metadata['status'] == 'VERIFIED' and metadata['checksumSha256'] == digest and metadata['sizeBytes'] == len(payload)
            drones = get(route + '/eligible-drones?limit=100')['items']
            assert drones
            current = get(route)
            post(key + '-dataset', route + '/datasets', dict(videoFileIds=[upload['fileId']], telemetryFileIds=[], deviceId=drones[0]['id'],
                recordedAt=journal.data['recordedAt'], scope=current['scope'], pairs=[dict(videoFileId=upload['fileId'], telemetryFileId=None, timeOffsetMilliseconds=0)]), etag='"' + current['version'] + '"')
        receipt = journal.data['steps'][key + '-dataset']
        assert receipt['state'] == 'ACKED', 'unknown dataset outcome retained'
        dataset = get('/api/v1/datasets/' + receipt['result']['id'])
        assert dataset['surveyTaskId'] == tid and dataset['telemetryStatus'] == 'MISSING'
        assert get(route)['status'] == 'SUBMITTED'
        coverage = get('/api/v1/datasets/' + dataset['id'] + '/coverage')
        assert coverage['datasetId'] == dataset['id']
        print(json.dumps(dict(scenario=key, taskId=tid, datasetId=dataset['id'], status='SUBMITTED', telemetry='MISSING')), flush=True)
    assert get('/api/v1/survey-tasks/' + source['id'])['status'] == 'SUBMITTED'
    print(json.dumps(dict(operatorTaskStatuses=Counter(item['status'] for item in seed.tasks(tokens['operator-a'])))))


if __name__ == '__main__':
    main()
