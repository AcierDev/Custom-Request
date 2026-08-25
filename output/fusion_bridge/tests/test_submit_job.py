import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path

from fusion_bridge.bridge.config import TARGET_NEW_DOCUMENT
from fusion_bridge.submit_job import EXIT_SUCCESS, build_payload, main


DEFAULT_REQUEST_ID = "submit_request"


class SubmitJobTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_build_payload_defaults_to_new_document(self):
        payload = build_payload(
            "ping",
            {},
            request_id=DEFAULT_REQUEST_ID,
        )

        self.assertEqual(payload["target"], TARGET_NEW_DOCUMENT)

    def test_main_enqueues_json_parameters(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            exit_code = main(
                [
                    "--root",
                    str(self.root),
                    "--job",
                    "ping",
                    "--parameters-json",
                    '{"width_mm": 10}',
                    "--request-id",
                    DEFAULT_REQUEST_ID,
                ]
            )

        request_path = self.root / "queue/inbox/submit_request.json"
        request = json.loads(request_path.read_text())
        self.assertEqual(exit_code, EXIT_SUCCESS)
        self.assertEqual(request["parameters"], {"width_mm": 10})
        self.assertEqual(output.getvalue().strip(), DEFAULT_REQUEST_ID)


if __name__ == "__main__":
    unittest.main()
