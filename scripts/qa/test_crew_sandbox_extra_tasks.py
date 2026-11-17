"""Safety checks for the ten-task sandbox batch; no network or credentials."""
import copy
import unittest

import crew_sandbox_extra_tasks as batch


class BatchSafety(unittest.TestCase):
    def setUp(self):
        self.detail = {'mode': 'CONDITIONAL_FT', 'assignedToUserId': batch.CREW,
                       'repairContext': {'mode': 'FAST_TRACK', 'status': 'Assigned'}}
        self.eligibility = {'sourceMapping': 'CONFIRMED', 'policyState': 'CONFIGURED',
                            'missingReasons': ['ASSESSMENT_REQUIRED', 'FIRST_START_NOT_VERIFIED'],
                            'originalVerifiedStart': None, 'executionExpiresAt': None}

    def test_ten_scopes_are_distinct_and_disjoint(self):
        scopes = batch.planned_scopes()
        self.assertEqual(len(set(scopes)), 10)
        self.assertTrue(all(a < b for a, b in scopes))
        self.assertTrue(all(b < c for (_, b), (c, _) in zip(scopes, scopes[1:])))
        self.assertGreater(scopes[0][0], 105)  # Existing fixture's last endpoint.

    def test_field_preparation_is_allowed_without_starting_clock(self):
        batch.assert_field_ready(self.detail, self.eligibility)

    def test_coverage_policy_unknown_reasons_or_active_clock_stop_batch(self):
        for key, value in [('sourceMapping', 'UNKNOWN'), ('policyState', 'MISSING'),
                           ('missingReasons', ['SOURCE_MAPPING_REQUIRED']),
                           ('originalVerifiedStart', '2026-11-17T00:00:00Z'),
                           ('executionExpiresAt', '2026-11-18T00:00:00Z')]:
            with self.subTest(key=key):
                eligibility = dict(self.eligibility, **{key: value})
                with self.assertRaises(RuntimeError):
                    batch.assert_field_ready(self.detail, eligibility)

    def test_other_actor_or_repair_state_stops_batch(self):
        detail = copy.deepcopy(self.detail)
        detail['assignedToUserId'] = 'another-actor'
        with self.assertRaises(RuntimeError):
            batch.assert_field_ready(detail, self.eligibility)
        detail = copy.deepcopy(self.detail)
        detail['repairContext']['status'] = 'InProgress'
        with self.assertRaises(RuntimeError):
            batch.assert_field_ready(detail, self.eligibility)


if __name__ == '__main__':
    unittest.main()
