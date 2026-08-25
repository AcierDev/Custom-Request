import tempfile
import unittest
from pathlib import Path

from fusion_bridge.bridge.config import (
    PROTOCOL_VERSION,
    TARGET_NEW_DOCUMENT,
)
from fusion_bridge.bridge.queue_store import BridgePaths, JobRequest
from fusion_bridge.bridge.runner import (
    JobContext,
    JobLoadError,
    JobResultError,
    execute_job,
    resolve_job_path,
)


DEFAULT_REQUEST_ID = "runner_request"


class RunnerTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.paths = BridgePaths.from_root(self.root)
        self.paths.ensure()

    def tearDown(self):
        self.temp_dir.cleanup()

    def write_job(self, name, source):
        path = self.paths.jobs / f"{name}.py"
        path.write_text(source)
        return path

    def make_context(self, job):
        request = JobRequest(
            version=PROTOCOL_VERSION,
            request_id=DEFAULT_REQUEST_ID,
            job=job,
            target=TARGET_NEW_DOCUMENT,
            parameters={},
        )
        return JobContext(
            app=None,
            document=None,
            request=request,
            paths=self.paths,
        )

    def test_resolves_direct_python_job(self):
        expected = self.write_job(
            "good",
            "def run(context):\n    return {'ok': True}\n",
        )

        resolved = resolve_job_path(self.paths.jobs, "good")

        self.assertEqual(resolved, expected)

    def test_rejects_symlink_that_escapes_jobs_directory(self):
        outside = self.root / "outside.py"
        outside.write_text("def run(context):\n    return {}\n")
        (self.paths.jobs / "escape.py").symlink_to(outside)

        with self.assertRaises(JobLoadError):
            resolve_job_path(self.paths.jobs, "escape")

    def test_executes_job_and_returns_json_result(self):
        self.write_job(
            "good",
            "def run(context):\n"
            "    return {'seen': context.request.request_id}\n",
        )

        result = execute_job(self.paths.jobs, self.make_context("good"))

        self.assertEqual(result, {"seen": DEFAULT_REQUEST_ID})

    def test_rejects_non_json_job_result(self):
        self.write_job(
            "bad_result",
            "def run(context):\n    return {'bad': object()}\n",
        )

        with self.assertRaises(JobResultError):
            execute_job(
                self.paths.jobs,
                self.make_context("bad_result"),
            )


if __name__ == "__main__":
    unittest.main()
