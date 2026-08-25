import json
import threading
from pathlib import Path

from .config import JSON_ENCODING


JSON_LINE_ENDING = "\n"


class DiagnosticLog:
    def __init__(self, path: Path):
        self.path = path
        self._lock = threading.Lock()

    def append(self, event, details=None):
        record = {
            "event": event,
            "details": details or {},
        }
        line = json.dumps(record, sort_keys=True) + JSON_LINE_ENDING
        with self._lock:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with self.path.open("a", encoding=JSON_ENCODING) as handle:
                handle.write(line)
                handle.flush()
