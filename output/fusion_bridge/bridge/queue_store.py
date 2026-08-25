import json
import os
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional

from .config import (
    ALLOWED_TARGETS,
    IDENTIFIER_PATTERN,
    JSON_ENCODING,
    MAX_REQUEST_BYTES,
    PROTOCOL_VERSION,
    REQUEST_FIELDS,
)


class RequestValidationError(ValueError):
    pass


class DuplicateRequestError(FileExistsError):
    pass


class DuplicateResultError(FileExistsError):
    pass


@dataclass(frozen=True)
class JobRequest:
    version: int
    request_id: str
    job: str
    target: str
    parameters: Dict[str, Any]


@dataclass(frozen=True)
class BridgePaths:
    root: Path
    jobs: Path
    inbox: Path
    processing: Path
    results: Path

    @classmethod
    def from_root(cls, root: Path) -> "BridgePaths":
        resolved_root = root.resolve()
        queue_root = resolved_root / "queue"
        return cls(
            root=resolved_root,
            jobs=resolved_root / "jobs",
            inbox=queue_root / "inbox",
            processing=queue_root / "processing",
            results=queue_root / "results",
        )

    def ensure(self) -> None:
        for directory in (
            self.jobs,
            self.inbox,
            self.processing,
            self.results,
        ):
            directory.mkdir(parents=True, exist_ok=True)


def validate_identifier(value: Any, field_name: str) -> str:
    if not isinstance(value, str) or not IDENTIFIER_PATTERN.fullmatch(value):
        raise RequestValidationError(f"{field_name} is not a valid identifier")
    return value


def validate_request(payload: Any) -> JobRequest:
    if not isinstance(payload, dict):
        raise RequestValidationError("request must be a JSON object")
    if frozenset(payload) != REQUEST_FIELDS:
        raise RequestValidationError("request fields do not match the protocol")
    if type(payload["version"]) is not int or payload["version"] != PROTOCOL_VERSION:
        raise RequestValidationError("unsupported protocol version")

    request_id = validate_identifier(payload["request_id"], "request_id")
    job = validate_identifier(payload["job"], "job")
    target = payload["target"]
    if target not in ALLOWED_TARGETS:
        raise RequestValidationError("unsupported target")
    parameters = payload["parameters"]
    if not isinstance(parameters, dict):
        raise RequestValidationError("parameters must be a JSON object")
    try:
        json.dumps(parameters)
    except (TypeError, ValueError) as error:
        raise RequestValidationError("parameters must be JSON-compatible") from error

    return JobRequest(
        version=payload["version"],
        request_id=request_id,
        job=job,
        target=target,
        parameters=parameters,
    )


class QueueStore:
    def __init__(self, paths: BridgePaths):
        self.paths = paths
        self.paths.ensure()

    def enqueue(self, payload: Dict[str, Any]) -> Path:
        request = validate_request(payload)
        destination = self.paths.inbox / f"{request.request_id}.json"
        if (self.paths.processing / destination.name).exists():
            raise DuplicateRequestError(request.request_id)
        return self._atomic_write_json(
            destination,
            payload,
            DuplicateRequestError,
        )

    def claim_next(self) -> Optional[Path]:
        for source in sorted(self.paths.inbox.glob("*.json")):
            destination = self.paths.processing / source.name
            if destination.exists():
                duplicate_token = uuid.uuid4().hex
                destination = self.paths.processing / (
                    f"{source.stem}-duplicate-{duplicate_token}.json"
                )
            try:
                os.link(source, destination)
                source.unlink()
                return destination
            except FileNotFoundError:
                continue
        return None

    def load_claimed(self, path: Path) -> JobRequest:
        resolved_path = path.resolve()
        if resolved_path.parent != self.paths.processing.resolve():
            raise RequestValidationError("claimed request is outside processing")
        raw = resolved_path.read_bytes()
        if len(raw) > MAX_REQUEST_BYTES:
            raise RequestValidationError("request exceeds byte limit")
        try:
            payload = json.loads(raw.decode(JSON_ENCODING))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise RequestValidationError("request is not valid JSON") from error
        return validate_request(payload)

    def has_pending(self) -> bool:
        return next(self.paths.inbox.glob("*.json"), None) is not None

    def result_path(self, request_id: str, kind: str = "result") -> Path:
        validated_request_id = validate_identifier(request_id, "request_id")
        validated_kind = validate_identifier(kind, "result kind")
        return self.paths.results / (
            f"{validated_request_id}.{validated_kind}.json"
        )

    def write_result(
        self,
        request_id: str,
        payload: Dict[str, Any],
        kind: str = "result",
    ) -> Path:
        destination = self.result_path(request_id, kind)
        return self._atomic_write_json(
            destination,
            payload,
            DuplicateResultError,
        )

    @staticmethod
    def _atomic_write_json(destination, payload, duplicate_error):
        encoded = json.dumps(
            payload,
            ensure_ascii=False,
            sort_keys=True,
        ).encode(JSON_ENCODING)
        if len(encoded) > MAX_REQUEST_BYTES:
            raise RequestValidationError("JSON payload exceeds byte limit")

        temporary = destination.parent / (
            f".{destination.name}.{uuid.uuid4().hex}.tmp"
        )
        try:
            with temporary.open("xb") as handle:
                handle.write(encoded)
                handle.flush()
                os.fsync(handle.fileno())
            try:
                os.link(temporary, destination)
            except FileExistsError as error:
                raise duplicate_error(str(destination)) from error
        finally:
            temporary.unlink(missing_ok=True)
        return destination
