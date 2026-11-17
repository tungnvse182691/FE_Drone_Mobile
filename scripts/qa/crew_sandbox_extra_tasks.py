"""Seed exactly ten assigned CONDITIONAL_FT tasks via existing local sandbox APIs.

Run with the same journal on retries. Never starts Crew's 24-hour clock, captures
measurements, or fabricates BEFORE photos. No BE source/config/SQL changes.
"""
import argparse
import base64
import datetime as dt
import json
import os
from pathlib import Path

import crew_sandbox_coverage as c

COUNT = 10
DEFECT = '339d8a3b-64c9-4a80-9fcd-ca2979acba2c'
CREW = '72f84201-a001-4000-8000-000000000008'
POLICY = 'ef8d6335-8517-48c9-ac0e-60d307b338e4'
ROAD = 'fc332a75-2f9b-4825-8e25-106c71cf8edd'
SEGMENTS = '0e5eed2f-93d9-4670-afd3-8849a29eab07'
HANDOVER = 'f4e486a8-d7e3-4764-ba81-276f6db96f23'
EXPECTED_FIELD_REASONS = {'CURRENT_EXECUTION_AUTHORITY_DENIED', 'ASSESSMENT_REQUIRED', 'FIRST_START_NOT_VERIFIED'}


def login(role, folder):
    accounts = {a['key']: a for a in json.loads(c.docker('exec', c.CONTAINER, 'cat', '/handoff/demo-accounts.json'))}
    account = accounts[role]
    password = os.environ.get('ROADGUARD_QA_' + role.upper().replace('-', '_') + '_PASSWORD', account['password'])
    with (folder / 'auth.jsonl').open('a', encoding='utf-8') as stream:
        stream.write(json.dumps({'environment': c.BASE, 'actorKey': role, 'path': '/api/v1/auth/android/login',
                                 'at': dt.datetime.now(dt.timezone.utc).isoformat()}) + '\n')
        stream.flush()
        os.fsync(stream.fileno())
    body, _ = c.ok(c.http('POST', '/api/v1/auth/android/login', body={'email': account['email'], 'password': password}))
    token = body['accessToken']
    claim = token.split('.')[1]
    actor = json.loads(base64.urlsafe_b64decode(claim + '=' * (-len(claim) % 4)))['sub']
    return token, actor


def planned_scopes():
    return [(110 + 4 * i, 112 + 4 * i) for i in range(COUNT)]


def assert_field_ready(detail, eligibility):
    if (detail['mode'] != 'CONDITIONAL_FT' or detail['assignedToUserId'] != CREW
            or detail['repairContext']['mode'] != 'FAST_TRACK'
            or detail['repairContext']['status'] != 'Assigned'):
        raise RuntimeError('Task mode/actor/state changed')
    if (eligibility['sourceMapping'] != 'CONFIRMED' or eligibility['policyState'] != 'CONFIGURED'
            or set(eligibility['missingReasons']) - EXPECTED_FIELD_REASONS
            or eligibility['originalVerifiedStart'] is not None
            or eligibility['executionExpiresAt'] is not None):
        raise RuntimeError('Unexpected prerequisite gap or first-start clock already running')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--journal-dir', type=Path, default=Path('.cache/crew-extra-ten-20261117'))
    args = parser.parse_args()
    c.verify_target()
    if not args.apply:
        print('Verified local target. Plan: 10 tasks, separate scopes 110-148m; --apply requires owner authorization.')
        return
    journal = c.Journal(args.journal_dir)
    if 'batch' not in journal.value:
        journal.value['batch'] = {'count': COUNT, 'label': 'SUA-NHANH-MOI',
                                  'dueAt': (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=7)).isoformat()}
        c.save(journal.path, journal.value)
    if journal.value['batch']['count'] != COUNT or journal.value['batch']['label'] != 'SUA-NHANH-MOI':
        raise RuntimeError('Journal batch identity mismatch')
    sessions = {role: login(role, args.journal_dir) for role in ('pm-a', 'supervisor', 'crew-a')}
    if sessions['crew-a'][1] != CREW:
        raise RuntimeError('Unexpected Crew identity')
    root = '/api/v1/projects/' + c.PROJECT
    pm, supervisor, crew = (sessions[r][0] for r in ('pm-a', 'supervisor', 'crew-a'))
    policy, _ = c.get(root + '/repair-policies/revisions/' + POLICY, pm)
    checklist = policy['checklistVersion']
    view, _ = c.get(root + '/road-coverage', supervisor)
    handover = next(s for s in view['sources'] if s['kind'] == 'HANDOVER' and s['id'] == HANDOVER)
    if handover['provenance'] == 'TEST_ONLY':
        raise RuntimeError('Never relabel TEST_ONLY handover')
    # Refuse overlap with another active obligation on the same physical road.
    ours = {s['response']['unresolvedMandatoryObligationIds'][0]
            for name, s in journal.value['steps'].items()
            if name.endswith('-package') and s.get('status') in (200, 201)}
    for start, end in planned_scopes():
        if any(s['roadSectionId'] == ROAD and s['obligationId'] not in ours
               and s['from'] < end and start < s['to'] for s in view['scopes']):
            raise RuntimeError('Planned scope overlaps another obligation; review instead of overwriting')
    common = ['ROADGUARD CREW SANDBOX - QA FIXTURE ONLY',
              'NOT A REAL MAINTENANCE BASIS OR PRODUCTION APPROVAL',
              'Project: ' + c.PROJECT, 'Road: ' + ROAD,
              'Ten disjoint scopes (meters), lateral offset 0 to 1:',
              *[f'{start} to {end}' for start, end in planned_scopes()]]
    file_id = c.upload('crew-extra-ten-maintenance', c.pdf(common), supervisor,
                       sessions['supervisor'][1], journal)
    tasks = []
    for index, (start, end) in enumerate(planned_scopes(), 1):
        name = f'SUA-NHANH-MOI-{index:02d}'
        reason = f'{name}: Sua nhanh co dieu kien - Duong 3A, Binh Chanh. QA, khong thi cong thuc te.'

        def post(suffix, role, path, body, etag):
            return c.ok(journal.post(name + '-' + suffix, path, sessions[role][0],
                                     sessions[role][1], body, etag), (200, 201))

        defect, headers = c.get(root + '/defects/' + DEFECT, pm)
        scope = {'physicalRoadId': ROAD, 'routeVersionId': defect['roadSectionVersionId'],
                 'segmentSetId': SEGMENTS, 'layoutRevisionId': None, 'slabId': None,
                 'fromMeters': start, 'toMeters': end, 'offsetFromMeters': 0, 'offsetToMeters': 1}
        package, headers = post('package', 'pm-a', root + '/repair-packages', {
            'defectId': DEFECT, 'defectVersion': defect['version'], 'reason': reason,
            'obligations': [{'kind': 'FORMAL_REPAIR', 'mandatory': True, 'scope': scope, 'reason': reason}],
        }, headers['ETag'])
        obligation = package['unresolvedMandatoryObligationIds'][0]
        package_path = root + '/repair-packages/' + package['id']
        item, headers = post('propose', 'pm-a', package_path + '/items', {
            'obligationId': obligation, 'mode': 'FAST_TRACK', 'checklistVersion': checklist,
            'repairPlan': 'QA: sua tam be tong; bao ve hien truong; chi kiem thu, khong thi cong thuc te',
            'reason': reason,
        }, headers['ETag'])
        item_path = package_path + '/items/' + item['id']
        defect, _ = c.get(root + '/defects/' + DEFECT, pm)
        task = {'defectId': DEFECT, 'defectVersion': defect['version'], 'surveyId': None,
                'sourceKind': 'REPORTER', 'routeVersionId': scope['routeVersionId'],
                'segmentSetId': SEGMENTS, 'layoutRevisionId': None, 'slabId': None,
                'purpose': 'POST_REPAIR', 'requiredMeasurementType': 1, 'measurementScope': '{}',
                'instructions': reason, 'assignedToUserId': CREW, 'dueAt': journal.value['batch']['dueAt'],
                'mapPublicationId': None, 'crsProfileRevisionId': None}
        binding, _ = post('assign', 'pm-a', item_path + '/assign',
                          {'task': task, 'policyRevisionId': POLICY, 'reason': reason}, headers['ETag'])
        view, headers = c.get(root + '/road-coverage', supervisor)
        source = next(s for s in view['sources'] if s['kind'] == 'MAINTENANCE_BASIS' and s['id'] == file_id)
        handover = next(s for s in view['sources'] if s['kind'] == 'HANDOVER' and s['id'] == HANDOVER)
        actual = next(s for s in view['scopes'] if s['obligationId'] == obligation)
        existing = [m for m in view['history'] if m['scopeObligationId'] == obligation]
        if not existing:
            first = dt.datetime.combine(dt.date.fromisoformat(handover['from']), dt.time(),
                                        tzinfo=dt.timezone(dt.timedelta(hours=7)))
            # The existing project handover is a QA fixture accepted in the previous checkpoint.
            post('coverage', 'supervisor', root + '/road-coverage', {
                'scopeObligationId': obligation, 'expectedScopeHash': actual['scopeHash'],
                'handoverDocumentId': HANDOVER, 'handoverVersion': handover['version'],
                'sourceKind': 'MAINTENANCE_BASIS', 'sourceId': file_id, 'sourceVersion': source['version'],
                'applicableFromUtc': first.isoformat(), 'applicableToUtc': journal.value['batch']['dueAt'],
                'provenance': 'REAL_SOURCE',
                'reason': reason + ' Owner-authorized isolated QA; new uploaded test basis, existing project QA handover. No production authority.',
            }, headers['ETag'])
        elif len(existing) != 1 or existing[0]['sourceId'] != file_id:
            raise RuntimeError('Another mapping owns the new scope')
        detail, _ = c.get(root + '/field-inspection-tasks/' + binding['taskId'], crew)
        eligibility, _ = c.get(item_path + '/eligibility', crew)
        assert_field_ready(detail, eligibility)
        row = {'name': name, 'taskId': binding['taskId'], 'packageId': package['id'],
               'itemId': item['id'], 'obligationId': obligation, 'from': start, 'to': end,
               'status': detail['status'], 'mode': detail['mode'], 'sourceMapping': eligibility['sourceMapping'],
               'policyState': eligibility['policyState'], 'missingReasons': eligibility['missingReasons'],
               'originalVerifiedStart': eligibility['originalVerifiedStart'],
               'executionExpiresAt': eligibility['executionExpiresAt']}
        tasks.append(row)
        c.save(args.journal_dir / 'tasks.json', tasks)
        print(name + ': assigned, policy configured, coverage confirmed; field preparation pending', flush=True)
    if len({t['taskId'] for t in tasks}) != COUNT:
        raise RuntimeError('Expected exactly ten distinct tasks')
    # Crew inbox is paginated: confirm all ten through the actual actor's listing.
    seen, cursor, cursors = set(), None, set()
    while True:
        from urllib.parse import urlencode
        query = {'limit': 100}
        if cursor:
            query['afterId'] = cursor
        page, _ = c.get(root + '/field-inspection-tasks?' + urlencode(query), crew)
        seen.update(t['id'] for t in page['items'])
        cursor = page['nextCursor']
        if not cursor:
            break
        if cursor in cursors:
            raise RuntimeError('Repeated inbox cursor')
        cursors.add(cursor)
    if not {t['taskId'] for t in tasks} <= seen:
        raise RuntimeError('A seeded task is missing from Crew inbox')
    c.save(args.journal_dir / 'summary.json', {
        'observedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'environment': c.BASE,
        'runtimeRevision': c.REVISION, 'taskCount': COUNT, 'allVisibleToCrew': True,
        'allCoverageConfirmed': True, 'allPolicyConfigured': True,
        'fieldStartAssessmentExecution': 'NOT_RUN - left for owner to test in Android',
        'tasks': tasks,
    })
    print('Verified 10/10 tasks in Crew inbox. No first-start clocks activated.')


if __name__ == '__main__':
    main()
