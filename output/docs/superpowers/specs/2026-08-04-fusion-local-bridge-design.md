# Fusion Local Bridge Design

## Goal

Let Codex create and modify Fusion models through Fusion's Python API without repetitive UI interaction, cloud credentials, or a paid Autodesk Automation API account.

## Chosen approach

Install a Python add-in linked from this workspace. The add-in starts with Fusion, watches a local request queue, runs approved job modules through Fusion's API on Fusion's main thread, and writes machine-readable results.

This is preferred over a declarative geometry language, which would be safer but too limited for general modeling, and over Autodesk's cloud Automation API, which adds credentials, uploads, and processing cost.

## Workspace layout

- `fusion_bridge/FusionBridge.py`: Fusion lifecycle and event integration only.
- `fusion_bridge/FusionBridge.manifest`: add-in metadata for macOS.
- `fusion_bridge/bridge/queue_store.py`: request validation, claiming, and result writing using only the Python standard library.
- `fusion_bridge/bridge/runner.py`: safe module resolution and job invocation.
- `fusion_bridge/jobs/`: generated modeling modules.
- `fusion_bridge/queue/inbox/`: atomic JSON request files.
- `fusion_bridge/queue/processing/`: claimed requests.
- `fusion_bridge/queue/results/`: success or failure JSON files.
- `fusion_bridge/tests/`: tests runnable outside Fusion.

## Request contract

Each request is a JSON object with these required fields:

- `version`: integer protocol version `1`.
- `request_id`: unique identifier containing letters, digits, hyphens, or underscores.
- `job`: Python module name located directly in `fusion_bridge/jobs`.
- `target`: either `new_document` or `active_document`.
- `parameters`: JSON object passed to the job.

The default generated request target is `new_document`. A job can modify the current model only when `target` is explicitly `active_document`.

## Execution flow

1. Codex writes a complete request to a temporary file, then atomically renames it into the inbox.
2. A background watcher detects the request and signals a Fusion custom event.
3. The custom-event handler runs on Fusion's main thread, validates and claims the request, imports the named job from the fixed jobs directory, and calls `run(context)`.
4. The context contains the Fusion application, selected document, request ID, target, parameters, and bridge paths.
5. The bridge writes a result with status, timing, output paths, and either the job result or a sanitized traceback.
6. Completed request files remain in `processing` for auditability; the bridge never deletes user files.

## Security and safety

- No network listener and no API keys.
- Jobs must resolve inside the fixed `jobs` directory; absolute paths, path separators, dot segments, and symlinks escaping that directory are rejected.
- Only JSON-compatible parameters cross the queue boundary.
- The currently open design is never selected implicitly.
- Queue polling intervals, protocol version, permitted identifiers, and size limits are named configuration constants.
- The add-in stops its watcher and unregisters Fusion events cleanly.

## Errors and recovery

Malformed or unsupported requests produce failure results without stopping the add-in. A failing job produces a failure result and leaves the request available for diagnosis. Duplicate request IDs are rejected if an existing result is present. Restarting Fusion resumes unclaimed inbox requests.

## Verification

Automated tests cover request validation, atomic claiming, path containment, duplicate handling, success results, and failure results without importing Fusion. Syntax compilation checks every Python file. In Fusion, a `ping` job verifies the queue and a temporary `smoke_box` job creates a new document and a rectangular solid, reports its body count and dimensions, and leaves the user's existing modified design untouched.
