"""Create isolated Operator UI fixtures through the local sandbox API.

Usage: python scripts/qa/operator_scenarios.py --apply
Repeat with the SAME journal to resume. No SQL writes, historical-task mutations,
credentials or tokens in output/journal. Coordinates are synthetic QA access points.
"""
import argparse
import importlib.util
import json
from pathlib import Path
from uuid import uuid4


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backend', type=Path, default=Path('D:/Do_AN_Drone/RoadGuardSystem-develop'))
    parser.add_argument('--journal', type=Path, default=Path('.cache/operator-ui-qa-scenarios.json'))
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    source = args.backend / 'deploy/fe-handoff/operator_sandbox_seed.py'
    spec = importlib.util.spec_from_file_location('operator_seed', source)
    seed = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(seed)
    assert seed.BASE == 'http://127.0.0.1:18181' and seed.PROJECT == 'roadguard-crew-sandbox'
    for container in seed.CONTAINERS:
        assert seed.command(['docker', 'inspect', '--format', '{{ index .Config.Labels "com.docker.compose.project" }}', container]) == seed.PROJECT
        assert seed.command(['docker', 'inspect', '--format', '{{.State.Running}}', container]) == 'true'
    assert seed.command(['docker', 'port', seed.API_CONTAINER, '8080/tcp']) == '127.0.0.1:18181'
    assert seed.command(['docker', 'exec', seed.API_CONTAINER, 'printenv', 'MinioStorage__PublicEndpoint']) == 'http://10.0.2.2:19101'
    assert seed.http('GET', '/minio/health/live', base='http://127.0.0.1:19101')[0] == 200
    database = seed.database_name()
    accounts = seed.accounts()
    sessions = {key: seed.login(accounts[key]) for key in ['pm-a', 'operator-a']}
    tokens = {key: value[0] for key, value in sessions.items()}
    actors = {key: value[1] for key, value in sessions.items()}
    assert all(actors.values())
    # Read the original task for scope only; never mutate it.
    status, historical, _ = seed.task_detail('25324063-5559-4c70-9283-d0ec321e09d6', tokens['operator-a'])
    assert status == 200 and historical['status'] == 'SUBMITTED'
    journal = seed.Journal(args.journal)
    if 'database' in journal.data:
        assert journal.data['database'] == database and journal.data['actors'] == actors
    else:
        journal.data.update(database=database, actors=actors, sourceTask=historical['id'])
        if args.apply:
            journal.save()
    scenarios = [(f'QA-OP-{kind}-{i:02}', kind) for kind in ['NEW', 'ACCEPTED'] for i in range(1, 11)]
    if not args.apply:
        print(json.dumps({'target': seed.PROJECT, 'database': database, 'create': scenarios, 'existingSteps': len(journal.data['steps'])}))
        return
    results = []
    fields = ('actor', 'actorId', 'method', 'path', 'body', 'headers', 'beforeIds', 'operator', 'projectId')
    for index, (key, kind) in enumerate(scenarios):
        saved = journal.data['steps'].get(key)
        if saved:
            intent = {field: saved[field] for field in fields}
        else:
            intent = seed.new_intent(key, 'pm-a', 'operator-a', {'operator-a': historical}, tokens, actors)
            intent['body']['accessPoint'] = {
                'point': {'longitude': 106.56 + index * 0.0001, 'latitude': 10.76},
                'source': 'MANUAL', 'accuracyMeters': None, 'capturedAt': None,
            }
        result = seed.execute_step(journal, key, intent,
            lambda step: seed.reconcile_create(step, tokens),
            lambda step: seed.http('POST', step['path'], tokens[step['actor']], step['body'], step['headers']))
        task_id = result['id']
        if kind == 'ACCEPTED':
            accept_key = key + '-ACCEPT'
            saved = journal.data['steps'].get(accept_key)
            if saved:
                accept = {field: saved[field] for field in ('actor', 'actorId', 'method', 'path', 'body', 'headers', 'taskId', 'projectId')}
            else:
                status, detail, headers = seed.task_detail(task_id, tokens['operator-a'])
                assert status == 200 and detail['status'] == 'NEW_ASSIGNED'
                etag = next((v for k, v in headers.items() if k.lower() == 'etag'), None)
                assert etag == '"' + detail['version'] + '"'
                accept = {'actor': 'operator-a', 'actorId': actors['operator-a'], 'method': 'POST',
                    'path': f'/api/v1/survey-tasks/{task_id}/accept', 'body': None,
                    'headers': {'Idempotency-Key': str(uuid4()), 'If-Match': etag},
                    'taskId': task_id, 'projectId': historical['projectId']}
            def reconcile(step):
                status, detail, _ = seed.task_detail(step['taskId'], tokens['operator-a'])
                if status != 200:
                    raise seed.UnknownOutcome('accept readback unavailable')
                if detail['status'] == 'ACCEPTED':
                    return detail
                if detail['status'] != 'NEW_ASSIGNED' or '"' + detail['version'] + '"' != step['headers']['If-Match']:
                    raise seed.UnknownOutcome('task changed; preserve original command')
                return None
            seed.execute_step(journal, accept_key, accept, reconcile,
                lambda step: seed.http('POST', step['path'], tokens['operator-a'], headers=step['headers']))
        status, detail, _ = seed.task_detail(task_id, tokens['operator-a'])
        expected = 'ACCEPTED' if kind == 'ACCEPTED' else 'NEW_ASSIGNED'
        assert status == 200 and detail['status'] == expected and detail['operatorId'] == actors['operator-a']
        status, work, _ = seed.api_get(f'/api/v1/survey-tasks/{task_id}/work-package', tokens['operator-a'])
        assert status == 200 and work['accessPoint']['point'] == intent['body']['accessPoint']['point']
        status, drones, _ = seed.api_get(f'/api/v1/survey-tasks/{task_id}/eligible-drones?limit=25', tokens['operator-a'])
        assert status == 200 and drones['items']
        results.append({'scenario': key, 'taskId': task_id, 'status': expected, 'accessPoint': 'SYNTHETIC_QA_MANUAL', 'eligibleDrones': len(drones['items'])})
        print(json.dumps(results[-1]), flush=True)
    assert seed.task_detail(historical['id'], tokens['operator-a'])[1]['status'] == 'SUBMITTED'
    print(json.dumps({'created': len(results), 'operatorTaskCount': len(seed.tasks(tokens['operator-a']))}))


if __name__ == '__main__':
    main()
