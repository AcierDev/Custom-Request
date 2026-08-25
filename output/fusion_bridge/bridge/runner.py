import importlib.util
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict

from .queue_store import (
    BridgePaths,
    JobRequest,
    RequestValidationError,
    validate_identifier,
)


MODULE_NAME_PREFIX = "fusion_bridge_job"
JOB_ENTRY_POINT = "run"


class JobLoadError(RuntimeError):
    pass


class JobResultError(TypeError):
    pass


@dataclass(frozen=True)
class JobContext:
    app: Any
    document: Any
    request: JobRequest
    paths: BridgePaths


def resolve_job_path(jobs_dir: Path, job_name: str) -> Path:
    try:
        validated_name = validate_identifier(job_name, "job")
    except RequestValidationError as error:
        raise JobLoadError(str(error)) from error

    try:
        jobs_root = jobs_dir.resolve(strict=True)
        candidate = (jobs_root / f"{validated_name}.py").resolve(strict=True)
    except FileNotFoundError as error:
        raise JobLoadError(f"job does not exist: {validated_name}") from error
    if candidate.parent != jobs_root:
        raise JobLoadError("job must be a direct file in the jobs directory")
    if not candidate.is_file():
        raise JobLoadError("job is not a regular file")
    return candidate


def execute_job(jobs_dir: Path, context: JobContext) -> Dict[str, Any]:
    job_path = resolve_job_path(jobs_dir, context.request.job)
    module_name = (
        f"{MODULE_NAME_PREFIX}_{context.request.job}_{context.request.request_id}"
    )
    spec = importlib.util.spec_from_file_location(module_name, job_path)
    if spec is None or spec.loader is None:
        raise JobLoadError(f"cannot load job: {context.request.job}")

    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    try:
        spec.loader.exec_module(module)
        entry_point = getattr(module, JOB_ENTRY_POINT, None)
        if not callable(entry_point):
            raise JobLoadError(f"job has no callable {JOB_ENTRY_POINT}(context)")
        result = entry_point(context)
    finally:
        sys.modules.pop(module_name, None)

    if not isinstance(result, dict):
        raise JobResultError("job result must be a JSON object")
    try:
        json.dumps(result)
    except (TypeError, ValueError) as error:
        raise JobResultError("job result must be JSON-compatible") from error
    return result
