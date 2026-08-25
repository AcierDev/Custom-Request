# Fusion Local Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, install, and verify a local Fusion add-in that executes generated Python modeling jobs from a safe file queue.

**Architecture:** A pure-Python queue, loader, and service layer owns validation and result reporting. A thin Fusion entry point watches the inbox on a worker thread and fires a Fusion custom event so all Fusion API calls execute on Fusion's main thread. Modeling jobs are isolated modules loaded only from the bridge's fixed `jobs` directory.

**Tech Stack:** Python standard library, Autodesk Fusion Python API, `unittest`, macOS Fusion desktop UI.

## Global Constraints

- No network listener and no API keys.
- The default request target is `new_document`; `active_document` must be explicit.
- Jobs resolve only inside `fusion_bridge/jobs`; path traversal and escaping symlinks are rejected.
- Numeric limits and intervals are named constants.
- No production function is added without first observing its test fail, except Fusion lifecycle hooks and manifest data that require the live application.
- Do not create a Git commit unless the user explicitly requests one.
- Do not modify or save the user's currently open Fusion design during installation or verification.

---

### Task 1: Queue contract and atomic storage

**Files:**
- Create: `fusion_bridge/bridge/__init__.py`
- Create: `fusion_bridge/bridge/config.py`
- Create: `fusion_bridge/bridge/queue_store.py`
- Create: `fusion_bridge/tests/test_queue_store.py`

**Interfaces:**
- Produces: `JobRequest`, `BridgePaths.from_root(root)`, `QueueStore.enqueue(payload)`, `QueueStore.claim_next()`, `QueueStore.load_claimed(path)`, `QueueStore.has_pending()`, `QueueStore.result_path(request_id, kind)`, and `QueueStore.write_result(request_id, payload, kind)`.

- [ ] **Step 1: Write validation tests**

```python
class RequestValidationTests(unittest.TestCase):
    def test_accepts_complete_version_one_request(self):
        request = validate_request(valid_payload())
        self.assertEqual(request.target, TARGET_NEW_DOCUMENT)

    def test_rejects_path_like_job_name(self):
        payload = valid_payload(job="../escape")
        with self.assertRaises(RequestValidationError):
            validate_request(payload)

    def test_rejects_unknown_target(self):
        payload = valid_payload(target="current")
        with self.assertRaises(RequestValidationError):
            validate_request(payload)

    def test_rejects_non_object_parameters(self):
        payload = valid_payload(parameters=[])
        with self.assertRaises(RequestValidationError):
            validate_request(payload)
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `python3 -m unittest fusion_bridge.tests.test_queue_store -v`

Expected: import failure because `bridge.queue_store` does not exist.

- [ ] **Step 3: Implement constants and request validation**

```python
PROTOCOL_VERSION = 1
TARGET_NEW_DOCUMENT = "new_document"
TARGET_ACTIVE_DOCUMENT = "active_document"
ALLOWED_TARGETS = frozenset({TARGET_NEW_DOCUMENT, TARGET_ACTIVE_DOCUMENT})
IDENTIFIER_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")
MAX_REQUEST_BYTES = 1_048_576

@dataclass(frozen=True)
class JobRequest:
    version: int
    request_id: str
    job: str
    target: str
    parameters: Dict[str, Any]

def validate_request(payload: Any) -> JobRequest:
    if not isinstance(payload, dict):
        raise RequestValidationError("request must be a JSON object")
    # Enforce the exact required keys, protocol version, identifier pattern,
    # allowed target set, and dictionary parameters before constructing JobRequest.
```

- [ ] **Step 4: Run validation tests and verify GREEN**

Run: `python3 -m unittest fusion_bridge.tests.test_queue_store.RequestValidationTests -v`

Expected: all validation tests pass.

- [ ] **Step 5: Write atomic queue tests**

```python
def test_enqueue_then_claim_moves_one_request_to_processing(self):
    store = self.make_store()
    inbox_path = store.enqueue(valid_payload())
    claimed_path = store.claim_next()
    self.assertFalse(inbox_path.exists())
    self.assertEqual(claimed_path.parent, store.paths.processing)
    self.assertEqual(store.load_claimed(claimed_path).request_id, "request_1")

def test_write_result_is_atomic_and_refuses_overwrite(self):
    store = self.make_store()
    path = store.write_result("request_1", {"status": "success"}, "result")
    self.assertEqual(json.loads(path.read_text())["status"], "success")
    with self.assertRaises(DuplicateResultError):
        store.write_result("request_1", {"status": "failure"}, "result")
```

- [ ] **Step 6: Run the queue tests and verify RED**

Run: `python3 -m unittest fusion_bridge.tests.test_queue_store.QueueStoreTests -v`

Expected: failures because queue methods are missing.

- [ ] **Step 7: Implement atomic queue operations**

```python
@dataclass(frozen=True)
class BridgePaths:
    root: Path
    jobs: Path
    inbox: Path
    processing: Path
    results: Path

    @classmethod
    def from_root(cls, root: Path) -> "BridgePaths":
        root = root.resolve()
        queue = root / "queue"
        return cls(root, root / "jobs", queue / "inbox",
                   queue / "processing", queue / "results")

class QueueStore:
    def enqueue(self, payload: Dict[str, Any]) -> Path:
        request = validate_request(payload)
        destination = self.paths.inbox / f"{request.request_id}.json"
        return self._atomic_write_json(destination, payload, replace=False)

    def claim_next(self) -> Optional[Path]:
        for source in sorted(self.paths.inbox.glob("*.json")):
            destination = self.paths.processing / source.name
            try:
                os.replace(source, destination)
                return destination
            except FileNotFoundError:
                continue
        return None

    def load_claimed(self, path: Path) -> JobRequest:
        if path.resolve().parent != self.paths.processing.resolve():
            raise RequestValidationError("claimed request is outside processing")
        raw = path.read_bytes()
        if len(raw) > MAX_REQUEST_BYTES:
            raise RequestValidationError("request exceeds byte limit")
        return validate_request(json.loads(raw.decode(JSON_ENCODING)))

    def has_pending(self) -> bool:
        return next(self.paths.inbox.glob("*.json"), None) is not None

    def result_path(self, request_id: str, kind: str = "result") -> Path:
        validate_identifier(request_id, "request_id")
        validate_identifier(kind, "result kind")
        return self.paths.results / f"{request_id}.{kind}.json"

    def write_result(self, request_id: str, payload: Dict[str, Any],
                     kind: str = "result") -> Path:
        return self._atomic_write_json(
            self.result_path(request_id, kind), payload, replace=False
        )
```

Write JSON to a UUID-named temporary file in the destination directory, flush and `os.fsync`, then publish with `os.replace`. Refuse an existing final result before publication.

- [ ] **Step 8: Run Task 1 tests and inspect changes**

Run: `python3 -m unittest fusion_bridge.tests.test_queue_store -v`

Expected: all Task 1 tests pass. Inspect with `git diff -- fusion_bridge`; do not commit.

---

### Task 2: Contained job loading and execution

**Files:**
- Create: `fusion_bridge/bridge/runner.py`
- Create: `fusion_bridge/tests/test_runner.py`

**Interfaces:**
- Consumes: `JobRequest`, `BridgePaths.jobs`.
- Produces: `JobContext`, `resolve_job_path(jobs_dir, job_name)`, and `execute_job(jobs_dir, context)`.

- [ ] **Step 1: Write path-containment and execution tests**

```python
def test_resolves_direct_python_job(self):
    self.write_job("good", "def run(context):\n    return {'seen': context.request.request_id}\n")
    self.assertEqual(resolve_job_path(self.jobs, "good"), self.jobs / "good.py")

def test_rejects_symlink_that_escapes_jobs_directory(self):
    outside = self.root / "outside.py"
    outside.write_text("def run(context): return {}\n")
    (self.jobs / "escape.py").symlink_to(outside)
    with self.assertRaises(JobLoadError):
        resolve_job_path(self.jobs, "escape")

def test_executes_job_and_requires_json_result(self):
    self.write_job("good", "def run(context):\n    return {'ok': True}\n")
    self.assertEqual(execute_job(self.jobs, self.context("good")), {"ok": True})
```

- [ ] **Step 2: Run and verify RED**

Run: `python3 -m unittest fusion_bridge.tests.test_runner -v`

Expected: import failure because `bridge.runner` does not exist.

- [ ] **Step 3: Implement the runner**

```python
@dataclass(frozen=True)
class JobContext:
    app: Any
    document: Any
    request: JobRequest
    paths: BridgePaths

def resolve_job_path(jobs_dir: Path, job_name: str) -> Path:
    validate_identifier(job_name, "job")
    jobs_root = jobs_dir.resolve(strict=True)
    candidate = (jobs_root / f"{job_name}.py").resolve(strict=True)
    if candidate.parent != jobs_root:
        raise JobLoadError("job must be a direct file in the jobs directory")
    return candidate

def execute_job(jobs_dir: Path, context: JobContext) -> Dict[str, Any]:
    # Load under a request-specific module name, require callable run(context),
    # execute it, and reject results that json.dumps cannot serialize.
```

- [ ] **Step 4: Run Task 2 tests and inspect changes**

Run: `python3 -m unittest fusion_bridge.tests.test_runner -v`

Expected: all Task 2 tests pass. Inspect with `git diff -- fusion_bridge`; do not commit.

---

### Task 3: Service orchestration and submission tool

**Files:**
- Create: `fusion_bridge/bridge/service.py`
- Create: `fusion_bridge/submit_job.py`
- Create: `fusion_bridge/tests/test_service.py`
- Create: `fusion_bridge/tests/test_submit_job.py`

**Interfaces:**
- Consumes: `QueueStore`, `JobRequest`, `JobContext`, `execute_job`.
- Produces: `BridgeService.process_one(context_factory) -> bool` and a command-line queue submitter.

- [ ] **Step 1: Write service behavior tests**

```python
def test_process_one_writes_success_result(self):
    self.enqueue("ping")
    service = BridgeService(self.store, self.jobs, clock=self.clock)
    processed = service.process_one(self.context_factory)
    result = self.read_result("request_1")
    self.assertTrue(processed)
    self.assertEqual(result["status"], "success")
    self.assertEqual(result["result"], {"pong": True})

def test_process_one_writes_failure_result_for_job_exception(self):
    self.enqueue("broken")
    service = BridgeService(self.store, self.jobs, clock=self.clock)
    service.process_one(self.context_factory)
    result = self.read_result("request_1")
    self.assertEqual(result["status"], "failure")
    self.assertEqual(result["error"]["type"], "RuntimeError")

def test_existing_result_rejects_duplicate_without_running_job(self):
    self.store.write_result("request_1", {"status": "success"})
    self.enqueue("sentinel")
    BridgeService(self.store, self.jobs, clock=self.clock).process_one(self.context_factory)
    self.assertFalse(self.sentinel_path.exists())
    self.assertTrue(self.store.result_path("request_1", "duplicate").exists())
```

- [ ] **Step 2: Run service tests and verify RED**

Run: `python3 -m unittest fusion_bridge.tests.test_service -v`

Expected: import failure because `bridge.service` does not exist.

- [ ] **Step 3: Implement service orchestration**

```python
class BridgeService:
    def process_one(self, context_factory: Callable[[JobRequest], JobContext]) -> bool:
        claimed = self.store.claim_next()
        if claimed is None:
            return False
        # Load and validate, reject duplicates, construct context, execute the
        # job, and atomically write success/failure JSON with timestamps and
        # duration. Failure tracebacks replace the bridge root with "<bridge>".
        return True
```

Malformed requests use a stable SHA-256-derived fallback identifier and write a `failure` result. Existing request IDs write a separate `duplicate` result and never invoke the job.

- [ ] **Step 4: Run service tests and verify GREEN**

Run: `python3 -m unittest fusion_bridge.tests.test_service -v`

Expected: all service tests pass.

- [ ] **Step 5: Write submitter tests, verify RED, then implement**

```python
def test_build_payload_defaults_to_new_document(self):
    payload = build_payload("ping", {}, request_id="request_1")
    self.assertEqual(payload["target"], TARGET_NEW_DOCUMENT)

def test_main_enqueues_json_parameters(self):
    exit_code = main(["--root", str(self.root), "--job", "ping",
                      "--parameters-json", '{"width_mm": 10}',
                      "--request-id", "request_1"])
    self.assertEqual(exit_code, EXIT_SUCCESS)
    self.assertTrue((self.root / "queue/inbox/request_1.json").exists())
```

Run before implementation: `python3 -m unittest fusion_bridge.tests.test_submit_job -v`

Implement `argparse` options `--root`, `--job`, `--target`, `--parameters-json`, and optional `--request-id`. Generate absent IDs with `uuid.uuid4().hex`, validate through `QueueStore.enqueue`, and print only the request ID.

- [ ] **Step 6: Run Task 3 tests and inspect changes**

Run: `python3 -m unittest fusion_bridge.tests.test_service fusion_bridge.tests.test_submit_job -v`

Expected: all Task 3 tests pass. Inspect with `git diff -- fusion_bridge`; do not commit.

---

### Task 4: Fusion lifecycle and smoke jobs

**Files:**
- Create: `fusion_bridge/FusionBridge.py`
- Create: `fusion_bridge/FusionBridge.manifest`
- Create: `fusion_bridge/jobs/__init__.py`
- Create: `fusion_bridge/jobs/ping.py`
- Create: `fusion_bridge/jobs/smoke_box.py`
- Create: `fusion_bridge/tests/test_jobs.py`

**Interfaces:**
- Consumes: `BridgePaths`, `QueueStore`, `BridgeService`, `JobContext`.
- Produces: Fusion `run(context)` and `stop(context)` hooks plus `ping` and `smoke_box` jobs.

- [ ] **Step 1: Write job tests and verify RED**

```python
def test_ping_reports_protocol_and_request(self):
    context = make_context("ping_request")
    self.assertEqual(ping.run(context), {
        "pong": True,
        "protocol_version": PROTOCOL_VERSION,
        "request_id": "ping_request",
    })

def test_all_bridge_python_files_compile(self):
    for path in BRIDGE_ROOT.rglob("*.py"):
        py_compile.compile(str(path), doraise=True)
```

Run: `python3 -m unittest fusion_bridge.tests.test_jobs -v`

Expected: import failure because `jobs.ping` does not exist.

- [ ] **Step 2: Implement `ping` and the Fusion manifest**

```json
{
  "autodeskProduct": "Fusion",
  "type": "addin",
  "id": "com.openai.codex.fusionbridge",
  "author": "OpenAI Codex",
  "description": {"": "Local file-queue bridge for Fusion API jobs"},
  "version": "1.0.0",
  "runOnStartup": true,
  "supportedOS": "mac",
  "editEnabled": true
}
```

Run the job tests again and confirm the ping test passes while the compilation test still fails until the entry point exists.

- [ ] **Step 3: Implement the Fusion entry point**

```python
EVENT_ID = "com.openai.codex.fusionbridge.queue"
POLL_INTERVAL_SECONDS = 0.25
WATCHER_JOIN_TIMEOUT_SECONDS = 2.0
MAX_REQUESTS_PER_EVENT = 8

class QueueEventHandler(adsk.core.CustomEventHandler):
    def notify(self, args):
        for _ in range(MAX_REQUESTS_PER_EVENT):
            if not _service.process_one(_make_context):
                break

class QueueWatcher(threading.Thread):
    def run(self):
        while not self._stop_event.wait(POLL_INTERVAL_SECONDS):
            if self._store.has_pending():
                self._app.fireCustomEvent(EVENT_ID)
```

`run(context)` creates paths and service objects, registers the custom event and retained handler, starts the daemon watcher, and fires once if pending work exists. `_make_context(request)` creates a new Fusion design document only for `new_document`; it uses `app.activeDocument` only for explicit `active_document`. `stop(context)` signals and joins the watcher, removes the handler, and unregisters the custom event.

- [ ] **Step 4: Implement `smoke_box`**

Use named defaults for width, depth, and height in millimeters. Cast the active product to `adsk.fusion.Design`, create a centered rectangle on the root component XY plane, call `extrudeFeatures.addSimple` with a `ValueInput` in millimeters, name the body, and return the requested dimensions and resulting body count.

```python
DEFAULT_WIDTH_MM = 40.0
DEFAULT_DEPTH_MM = 30.0
DEFAULT_HEIGHT_MM = 10.0
BODY_NAME = "Fusion Bridge Smoke Box"
```

- [ ] **Step 5: Run all automated checks**

Run: `python3 -m unittest discover -s fusion_bridge/tests -v`

Run: `python3 -m compileall -q fusion_bridge`

Expected: all tests pass and compilation exits successfully. Inspect with `git diff -- fusion_bridge`; do not commit.

---

### Task 5: Link, start, and verify in Fusion

**Files:**
- Runtime outputs: `fusion_bridge/queue/inbox/*.json`
- Runtime outputs: `fusion_bridge/queue/processing/*.json`
- Runtime outputs: `fusion_bridge/queue/results/*.json`

**Interfaces:**
- Consumes: live Autodesk Fusion and `fusion_bridge/submit_job.py`.
- Produces: a running startup-enabled add-in and end-to-end result evidence.

- [ ] **Step 1: Link the add-in without touching the open model**

Open Fusion's **Scripts and Add-Ins** dialog, choose **Script or add-in from device**, select the absolute `fusion_bridge` folder, and ensure the add-in is set to run on startup.

- [ ] **Step 2: Start the add-in and inspect fresh Fusion state**

Start `FusionBridge`, close the dialog, and re-read Fusion's UI state. Do not save, close, or edit the pre-existing modified document.

- [ ] **Step 3: Submit and verify ping**

Run: `python3 fusion_bridge/submit_job.py --root fusion_bridge --job ping --request-id install_ping`

Poll `fusion_bridge/queue/results/install_ping.result.json` for at most the named verification timeout. Expected status: `success`, result `pong: true`, protocol version `1`.

- [ ] **Step 4: Submit and verify a geometry smoke test**

Run: `python3 fusion_bridge/submit_job.py --root fusion_bridge --job smoke_box --parameters-json '{"width_mm":40,"depth_mm":30,"height_mm":10}' --request-id install_smoke_box`

Expected: Fusion opens a new unsaved design, the result reports `success`, dimensions `40 × 30 × 10 mm`, and body count `1`. The original modified design remains open and unchanged.

- [ ] **Step 5: Perform final fresh verification**

Run: `python3 -m unittest discover -s fusion_bridge/tests -v`

Run: `python3 -m compileall -q fusion_bridge`

Read both result JSON files and inspect the live Fusion canvas. Report exact test counts, request outcomes, installation state, and any remaining temporary smoke document. Do not commit or push.
