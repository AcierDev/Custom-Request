import json
import tempfile
import unittest
from pathlib import Path

from fusion_bridge.bridge.config import (
    PROTOCOL_VERSION,
    TARGET_NEW_DOCUMENT,
)
from fusion_bridge.bridge.queue_store import BridgePaths, QueueStore
from fusion_bridge.bridge.runner import JobContext
from fusion_bridge.bridge.service import BridgeService


DEFAULT_REQUEST_ID = "service_request"
FIXED_CLOCK_SECONDS = 1_700_000_000.0
START_TIMER_SECONDS = 25.0
END_TIMER_SECONDS = 25.125


class SequenceTimer:
    def __init__(self, values):
        self.values = iter(values)

    def __call__(self):
        return next(self.values)


class ServiceTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.paths = BridgePaths.from_root(self.root)
        self.store = QueueStore(self.paths)

    def tearDown(self):
        self.temp_dir.cleanup()

    def write_job(self, name, source):
        (self.paths.jobs / f"{name}.py").write_text(source)

    def enqueue(self, job, request_id=DEFAULT_REQUEST_ID):
        self.store.enqueue(
            {
                "version": PROTOCOL_VERSION,
                "request_id": request_id,
                "job": job,
                "target": TARGET_NEW_DOCUMENT,
                "parameters": {},
            }
        )

    def make_service(self):
        return BridgeService(
            self.store,
            self.paths.jobs,
            clock=lambda: FIXED_CLOCK_SECONDS,
            timer=SequenceTimer(
                [
                    START_TIMER_SECONDS,
                    END_TIMER_SECONDS,
                ]
            ),
        )

    def context_factory(self, request):
        return JobContext(
            app=None,
            document=None,
            request=request,
            paths=self.paths,
        )

    def read_result(self, request_id, kind="result"):
        return json.loads(
            self.store.result_path(request_id, kind).read_text()
        )

    def test_process_one_writes_success_result(self):
        self.write_job(
            "ping",
            "def run(context):\n    return {'pong': True}\n",
        )
        self.enqueue("ping")

        processed = self.make_service().process_one(self.context_factory)

        result = self.read_result(DEFAULT_REQUEST_ID)
        self.assertTrue(processed)
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["result"], {"pong": True})

    def test_process_one_writes_failure_result_for_job_exception(self):
        self.write_job(
            "broken",
            "def run(context):\n    raise RuntimeError('broken job')\n",
        )
        self.enqueue("broken")

        self.make_service().process_one(self.context_factory)

        result = self.read_result(DEFAULT_REQUEST_ID)
        self.assertEqual(result["status"], "failure")
        self.assertEqual(result["error"]["type"], "RuntimeError")
        self.assertIn("<bridge>", result["error"]["traceback"])

    def test_existing_result_rejects_duplicate_without_running_job(self):
        sentinel_path = self.root / "sentinel"
        self.write_job(
            "sentinel",
            "def run(context):\n"
            f"    open({str(sentinel_path)!r}, 'w').close()\n"
            "    return {'ran': True}\n",
        )
        self.store.write_result(
            DEFAULT_REQUEST_ID,
            {"status": "success"},
        )
        self.enqueue("sentinel")

        self.make_service().process_one(self.context_factory)

        self.assertFalse(sentinel_path.exists())
        duplicate = self.read_result(DEFAULT_REQUEST_ID, "duplicate")
        self.assertEqual(duplicate["status"], "failure")

    def test_process_one_returns_false_when_inbox_is_empty(self):
        service = BridgeService(self.store, self.paths.jobs)

        self.assertFalse(service.process_one(self.context_factory))

    def test_malformed_request_with_unsafe_filename_gets_failure_result(self):
        malformed_path = self.paths.inbox / "bad request.json"
        malformed_path.write_text("not JSON")

        self.make_service().process_one(self.context_factory)

        results = list(self.paths.results.glob("invalid_*.failure.json"))
        self.assertEqual(len(results), 1)
        result = json.loads(results[0].read_text())
        self.assertEqual(result["status"], "failure")
        self.assertEqual(result["error"]["type"], "RequestValidationError")


if __name__ == "__main__":
    unittest.main()
