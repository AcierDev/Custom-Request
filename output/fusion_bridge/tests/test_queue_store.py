import json
import tempfile
import unittest
from pathlib import Path

from fusion_bridge.bridge.config import (
    PROTOCOL_VERSION,
    TARGET_NEW_DOCUMENT,
)
from fusion_bridge.bridge.queue_store import (
    BridgePaths,
    DuplicateResultError,
    QueueStore,
    RequestValidationError,
    validate_request,
)


DEFAULT_REQUEST_ID = "request_1"
DEFAULT_JOB = "ping"


def valid_payload(**overrides):
    payload = {
        "version": PROTOCOL_VERSION,
        "request_id": DEFAULT_REQUEST_ID,
        "job": DEFAULT_JOB,
        "target": TARGET_NEW_DOCUMENT,
        "parameters": {},
    }
    payload.update(overrides)
    return payload


class RequestValidationTests(unittest.TestCase):
    def test_accepts_complete_version_one_request(self):
        request = validate_request(valid_payload())

        self.assertEqual(request.target, TARGET_NEW_DOCUMENT)

    def test_rejects_path_like_job_name(self):
        payload = valid_payload(job="../escape")

        with self.assertRaises(RequestValidationError):
            validate_request(payload)

    def test_rejects_unknown_target(self):
        payload = valid_payload(target="current")

        with self.assertRaises(RequestValidationError):
            validate_request(payload)

    def test_rejects_non_object_parameters(self):
        payload = valid_payload(parameters=[])

        with self.assertRaises(RequestValidationError):
            validate_request(payload)

    def test_rejects_unknown_fields(self):
        payload = valid_payload(unexpected=True)

        with self.assertRaises(RequestValidationError):
            validate_request(payload)


class QueueStoreTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.store = QueueStore(BridgePaths.from_root(self.root))

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_enqueue_then_claim_moves_one_request_to_processing(self):
        inbox_path = self.store.enqueue(valid_payload())

        claimed_path = self.store.claim_next()

        self.assertFalse(inbox_path.exists())
        self.assertEqual(claimed_path.parent, self.store.paths.processing)
        self.assertEqual(
            self.store.load_claimed(claimed_path).request_id,
            DEFAULT_REQUEST_ID,
        )

    def test_write_result_is_atomic_and_refuses_overwrite(self):
        path = self.store.write_result(
            DEFAULT_REQUEST_ID,
            {"status": "success"},
        )

        self.assertEqual(json.loads(path.read_text())["status"], "success")
        with self.assertRaises(DuplicateResultError):
            self.store.write_result(
                DEFAULT_REQUEST_ID,
                {"status": "failure"},
            )

    def test_has_pending_tracks_inbox_state(self):
        self.assertFalse(self.store.has_pending())

        self.store.enqueue(valid_payload())

        self.assertTrue(self.store.has_pending())


if __name__ == "__main__":
    unittest.main()
