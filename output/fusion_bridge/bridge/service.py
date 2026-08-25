import hashlib
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Optional

from .queue_store import (
    DuplicateRequestError,
    JobRequest,
    QueueStore,
    RequestValidationError,
    validate_identifier,
)
from .runner import JobContext, execute_job


STATUS_SUCCESS = "success"
STATUS_FAILURE = "failure"
RESULT_KIND = "result"
DUPLICATE_KIND = "duplicate"
FAILURE_KIND = "failure"
TRACEBACK_LIMIT = 20
FALLBACK_DIGEST_LENGTH = 12
DURATION_DECIMAL_PLACES = 6
BRIDGE_PATH_PLACEHOLDER = "<bridge>"


class BridgeService:
    def __init__(
        self,
        store: QueueStore,
        jobs_dir: Path,
        clock: Callable[[], float] = time.time,
        timer: Callable[[], float] = time.monotonic,
    ):
        self.store = store
        self.jobs_dir = jobs_dir
        self.clock = clock
        self.timer = timer

    def process_one(
        self,
        context_factory: Callable[[JobRequest], JobContext],
    ) -> bool:
        claimed = self.store.claim_next()
        if claimed is None:
            return False

        request: Optional[JobRequest] = None
        started_at = self.clock()
        started_timer = self.timer()
        result_kind = RESULT_KIND
        try:
            request = self.store.load_claimed(claimed)
            if self.store.result_path(request.request_id).exists():
                result_kind = DUPLICATE_KIND
                raise DuplicateRequestError(
                    f"result already exists for {request.request_id}"
                )
            context = context_factory(request)
            job_result = execute_job(self.jobs_dir, context)
            payload = {
                "status": STATUS_SUCCESS,
                "request_id": request.request_id,
                "job": request.job,
                "started_at": self._timestamp(started_at),
                "finished_at": self._timestamp(self.clock()),
                "duration_seconds": self._duration(started_timer),
                "result": job_result,
            }
        except Exception as error:
            request_id = (
                request.request_id
                if request is not None
                else self._fallback_request_id(claimed)
            )
            if request is None:
                result_kind = FAILURE_KIND
            payload = {
                "status": STATUS_FAILURE,
                "request_id": request_id,
                "job": request.job if request is not None else None,
                "started_at": self._timestamp(started_at),
                "finished_at": self._timestamp(self.clock()),
                "duration_seconds": self._duration(started_timer),
                "error": {
                    "type": type(error).__name__,
                    "message": str(error),
                    "traceback": self._sanitized_traceback(),
                },
            }

        self.store.write_result(
            payload["request_id"],
            payload,
            result_kind,
        )
        return True

    def _duration(self, started_timer: float) -> float:
        return round(
            self.timer() - started_timer,
            DURATION_DECIMAL_PLACES,
        )

    @staticmethod
    def _timestamp(seconds: float) -> str:
        return datetime.fromtimestamp(seconds, timezone.utc).isoformat()

    def _sanitized_traceback(self) -> str:
        return traceback.format_exc(limit=TRACEBACK_LIMIT).replace(
            str(self.store.paths.root),
            BRIDGE_PATH_PLACEHOLDER,
        )

    @staticmethod
    def _fallback_request_id(claimed: Path) -> str:
        try:
            return validate_identifier(claimed.stem, "request_id")
        except RequestValidationError:
            digest = hashlib.sha256(claimed.name.encode()).hexdigest()
            return f"invalid_{digest[:FALLBACK_DIGEST_LENGTH]}"
