import sys
import threading
import traceback
from pathlib import Path

import adsk.core
import adsk.fusion

if __package__:
    from .bridge.config import (
        TARGET_ACTIVE_DOCUMENT,
        TARGET_NEW_DOCUMENT,
    )
    from .bridge.queue_store import BridgePaths, QueueStore
    from .bridge.diagnostics import DiagnosticLog
    from .bridge.runner import JobContext
    from .bridge.service import BridgeService
else:
    ADDIN_DIRECTORY = str(Path(__file__).resolve().parent)
    if ADDIN_DIRECTORY not in sys.path:
        sys.path.insert(0, ADDIN_DIRECTORY)
    from bridge.config import (
        TARGET_ACTIVE_DOCUMENT,
        TARGET_NEW_DOCUMENT,
    )
    from bridge.queue_store import BridgePaths, QueueStore
    from bridge.diagnostics import DiagnosticLog
    from bridge.runner import JobContext
    from bridge.service import BridgeService


EVENT_ID = "com.openai.codex.fusionbridge.queue"
WATCHER_NAME = "FusionBridgeQueueWatcher"
POLL_INTERVAL_SECONDS = 0.25
WATCHER_JOIN_TIMEOUT_SECONDS = 2.0
MAX_REQUESTS_PER_EVENT = 8
LOG_TRACEBACK_LIMIT = 20
DIAGNOSTICS_FILENAME = "diagnostics.jsonl"

_app = None
_custom_event = None
_event_handler = None
_stop_event = None
_notification_pending = None
_watcher = None
_store = None
_service = None
_paths = None
_diagnostics = None


class QueueEventHandler(adsk.core.CustomEventHandler):
    def notify(self, args):
        del args
        _notification_pending.clear()
        _diagnostics.append("event_received")
        try:
            for _index in range(MAX_REQUESTS_PER_EVENT):
                processed = _service.process_one(_make_context)
                if not processed:
                    break
                _diagnostics.append("request_processed")
        except Exception:
            _log_exception("queue processing failed")


class QueueWatcher(threading.Thread):
    def __init__(
        self,
        app,
        store,
        stop_event,
        notification_pending,
        diagnostics,
    ):
        super().__init__(name=WATCHER_NAME, daemon=True)
        self._app = app
        self._store = store
        self._stop_event = stop_event
        self._notification_pending = notification_pending
        self._diagnostics = diagnostics

    def run(self):
        while not self._stop_event.wait(POLL_INTERVAL_SECONDS):
            if self._store.has_pending() and not self._notification_pending.is_set():
                self._notification_pending.set()
                accepted = self._app.fireCustomEvent(EVENT_ID)
                self._diagnostics.append(
                    "event_requested",
                    {"accepted": accepted},
                )
                if not accepted:
                    self._notification_pending.clear()


def _make_context(request):
    if request.target == TARGET_NEW_DOCUMENT:
        document = _app.documents.add(
            adsk.core.DocumentTypes.FusionDesignDocumentType
        )
    elif request.target == TARGET_ACTIVE_DOCUMENT:
        document = _app.activeDocument
        if document is None:
            raise RuntimeError("there is no active Fusion document")
    else:
        raise RuntimeError(f"unsupported target: {request.target}")
    return JobContext(
        app=_app,
        document=document,
        request=request,
        paths=_paths,
    )


def _notify_if_pending():
    if _store.has_pending() and not _notification_pending.is_set():
        _notification_pending.set()
        accepted = _app.fireCustomEvent(EVENT_ID)
        _diagnostics.append(
            "initial_event_requested",
            {"accepted": accepted},
        )
        if not accepted:
            _notification_pending.clear()


def _log_exception(message):
    if _app is not None:
        details = traceback.format_exc(limit=LOG_TRACEBACK_LIMIT)
        _app.log(f"FusionBridge: {message}\n{details}")
        if _diagnostics is not None:
            _diagnostics.append(
                "exception",
                {"message": message, "traceback": details},
            )


def run(context):
    del context
    global _app
    global _custom_event
    global _event_handler
    global _stop_event
    global _notification_pending
    global _watcher
    global _store
    global _service
    global _paths
    global _diagnostics

    try:
        if _watcher is not None and _watcher.is_alive():
            return
        _app = adsk.core.Application.get()
        _paths = BridgePaths.from_root(Path(__file__).resolve().parent)
        _diagnostics = DiagnosticLog(
            _paths.root / "queue" / DIAGNOSTICS_FILENAME
        )
        _diagnostics.append("startup")
        _store = QueueStore(_paths)
        _service = BridgeService(_store, _paths.jobs)
        _stop_event = threading.Event()
        _notification_pending = threading.Event()
        _custom_event = _app.registerCustomEvent(EVENT_ID)
        _event_handler = QueueEventHandler()
        _custom_event.add(_event_handler)
        _watcher = QueueWatcher(
            _app,
            _store,
            _stop_event,
            _notification_pending,
            _diagnostics,
        )
        _watcher.start()
        _diagnostics.append("watcher_started")
        _notify_if_pending()
    except Exception:
        _log_exception("startup failed")
        raise


def stop(context):
    del context
    global _custom_event
    global _event_handler
    global _stop_event
    global _notification_pending
    global _watcher
    global _store
    global _service
    global _paths
    global _diagnostics

    try:
        if _stop_event is not None:
            _stop_event.set()
        if _watcher is not None:
            _watcher.join(WATCHER_JOIN_TIMEOUT_SECONDS)
        if _custom_event is not None and _event_handler is not None:
            _custom_event.remove(_event_handler)
        if _app is not None:
            _app.unregisterCustomEvent(EVENT_ID)
        if _diagnostics is not None:
            _diagnostics.append("shutdown")
    except Exception:
        _log_exception("shutdown failed")
    finally:
        _custom_event = None
        _event_handler = None
        _stop_event = None
        _notification_pending = None
        _watcher = None
        _store = None
        _service = None
        _paths = None
        _diagnostics = None
