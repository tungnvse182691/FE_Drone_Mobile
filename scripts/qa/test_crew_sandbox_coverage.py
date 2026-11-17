"""Safety checks for the local-only fixture runner. No Docker/HTTP mutations."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('fixture', Path(__file__).with_name('crew_sandbox_coverage.py'))
fixture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fixture)


class FixtureSafety(unittest.TestCase):
    def test_wrong_compose_project_or_revision_prevents_apply(self):
        for project, revision in [('other', fixture.REVISION), ('roadguard-crew-sandbox', 'old')]:
            info = [{'Config': {'Labels': {'com.docker.compose.project': project,
                                          'org.opencontainers.image.revision': revision}},
                     'State': {'Running': True}}]
            with patch.object(fixture, 'docker', return_value=json.dumps(info)):
                with self.assertRaisesRegex(RuntimeError, 'identity/revision/port'):
                    fixture.verify_target()

    def test_unknown_transport_outcome_replays_exact_persisted_intent(self):
        with tempfile.TemporaryDirectory() as folder:
            journal = fixture.Journal(Path(folder))
            with patch.object(fixture, 'http', side_effect=TimeoutError):
                with self.assertRaises(TimeoutError):
                    journal.post('map', '/coverage', 'private-token', 'actor', {'scope': 'original'}, '"v1"')
            saved = json.loads(journal.path.read_text())
            self.assertNotIn('private-token', journal.path.read_text())
            self.assertEqual(saved['steps']['map']['state'], 'UNKNOWN_OUTCOME')
            journal = fixture.Journal(Path(folder))
            with patch.object(fixture, 'http', return_value=(201, {'id': 'server-id'}, {})) as send:
                journal.post('map', '/coverage', 'new-session-token', 'actor', {'scope': 'changed'}, '"v2"')
            args = send.call_args.args
            self.assertEqual(args[3], {'scope': 'original'})
            self.assertEqual(args[4]['If-Match'], '"v1"')
            self.assertEqual(args[4]['Idempotency-Key'], saved['steps']['map']['key'])

    def test_actor_switch_never_replays_another_actors_command(self):
        with tempfile.TemporaryDirectory() as folder:
            journal = fixture.Journal(Path(folder))
            with patch.object(fixture, 'http', return_value=(201, {}, {})):
                journal.post('map', '/coverage', 'token', 'actor-a', {})
            with patch.object(fixture, 'http') as send:
                with self.assertRaisesRegex(RuntimeError, 'actor/resource changed'):
                    journal.post('map', '/coverage', 'token', 'actor-b', {})
                send.assert_not_called()

    def test_server_error_keeps_unknown_outcome(self):
        with tempfile.TemporaryDirectory() as folder:
            journal = fixture.Journal(Path(folder))
            with patch.object(fixture, 'http', return_value=(503, {'code': 'unavailable'}, {})):
                with self.assertRaisesRegex(RuntimeError, 'outcome unknown'):
                    journal.post('map', '/coverage', 'token', 'actor', {})
            step = json.loads(journal.path.read_text())['steps']['map']
            self.assertEqual(step['state'], 'UNKNOWN_OUTCOME')
            self.assertNotIn('status', step)

    def test_signed_urls_never_enter_journal(self):
        with tempfile.TemporaryDirectory() as folder:
            journal = fixture.Journal(Path(folder))
            with patch.object(fixture, 'http', return_value=(200, {'url': 'private-signed-url'}, {})):
                journal.post('urls', '/part-urls', 'token', 'actor', {'partNumbers': [1]}, ephemeral=True)
            self.assertNotIn('private-signed-url', journal.path.read_text())


if __name__ == '__main__':
    unittest.main()
