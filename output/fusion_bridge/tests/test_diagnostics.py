import json
import tempfile
import unittest
from pathlib import Path

from fusion_bridge.bridge.diagnostics import DiagnosticLog


DEFAULT_EVENT = "watcher_started"


class DiagnosticLogTests(unittest.TestCase):
    def test_append_writes_one_json_event(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "diagnostics.jsonl"
            log = DiagnosticLog(path)

            log.append(DEFAULT_EVENT, {"alive": True})

            records = [json.loads(line) for line in path.read_text().splitlines()]
            self.assertEqual(
                records,
                [{"event": DEFAULT_EVENT, "details": {"alive": True}}],
            )


if __name__ == "__main__":
    unittest.main()
