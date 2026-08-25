import argparse
import json
import uuid
from pathlib import Path

if __package__:
    from .bridge.config import (
        ALLOWED_TARGETS,
        PROTOCOL_VERSION,
        TARGET_NEW_DOCUMENT,
    )
    from .bridge.queue_store import BridgePaths, QueueStore
else:
    from bridge.config import (
        ALLOWED_TARGETS,
        PROTOCOL_VERSION,
        TARGET_NEW_DOCUMENT,
    )
    from bridge.queue_store import BridgePaths, QueueStore


EXIT_SUCCESS = 0
EMPTY_PARAMETERS_JSON = "{}"
DEFAULT_ROOT = Path(__file__).resolve().parent


def build_payload(
    job,
    parameters,
    request_id=None,
    target=TARGET_NEW_DOCUMENT,
):
    return {
        "version": PROTOCOL_VERSION,
        "request_id": request_id or uuid.uuid4().hex,
        "job": job,
        "target": target,
        "parameters": parameters,
    }


def build_parser():
    parser = argparse.ArgumentParser(
        description="Submit a local Autodesk Fusion bridge job.",
    )
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT)
    parser.add_argument("--job", required=True)
    parser.add_argument(
        "--target",
        choices=sorted(ALLOWED_TARGETS),
        default=TARGET_NEW_DOCUMENT,
    )
    parser.add_argument(
        "--parameters-json",
        default=EMPTY_PARAMETERS_JSON,
    )
    parser.add_argument("--request-id")
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    parameters = json.loads(args.parameters_json)
    payload = build_payload(
        args.job,
        parameters,
        request_id=args.request_id,
        target=args.target,
    )
    store = QueueStore(BridgePaths.from_root(args.root))
    store.enqueue(payload)
    print(payload["request_id"])
    return EXIT_SUCCESS


if __name__ == "__main__":
    raise SystemExit(main())
