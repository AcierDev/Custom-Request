import assert from "node:assert/strict";
import test from "node:test";

const {
  PALETTE_DELETE_IDLE_MS,
  createDeferredColorDeletionQueue,
} = await import("./deferredColorDeletion.ts");

const FIRST_TIMER_ID = 1;

const createFakeScheduler = () => {
  let nextId = FIRST_TIMER_ID;
  const tasks = new Map();
  const delays = new Map();

  return {
    schedule(callback, delayMs) {
      const id = nextId++;
      tasks.set(id, callback);
      delays.set(id, delayMs);
      return id;
    },
    cancel(id) {
      tasks.delete(id);
    },
    run(id) {
      const callback = tasks.get(id);
      if (!callback) return;
      tasks.delete(id);
      callback();
    },
    pendingIds() {
      return [...tasks.keys()];
    },
    delayFor(id) {
      return delays.get(id);
    },
  };
};

test("rapid color deletes restart the idle window and commit one batch", () => {
  const scheduler = createFakeScheduler();
  const pendingUpdates = [];
  const commits = [];
  const queue = createDeferredColorDeletionQueue({
    schedule: scheduler.schedule,
    cancel: scheduler.cancel,
    onPendingChange: (ids) => pendingUpdates.push(ids),
    onCommit: (ids) => commits.push(ids),
  });

  queue.queue("first");
  const [firstTimer] = scheduler.pendingIds();
  assert.equal(scheduler.delayFor(firstTimer), PALETTE_DELETE_IDLE_MS);
  assert.deepEqual(commits, []);

  queue.queue("second");
  const [replacementTimer] = scheduler.pendingIds();
  assert.notEqual(replacementTimer, firstTimer);
  scheduler.run(firstTimer);
  assert.deepEqual(commits, []);

  scheduler.run(replacementTimer);
  assert.deepEqual(commits, [["first", "second"]]);
  assert.deepEqual(pendingUpdates, [
    ["first"],
    ["first", "second"],
    [],
  ]);
});

test("duplicate delete clicks keep one pending color ID", () => {
  const scheduler = createFakeScheduler();
  const commits = [];
  const queue = createDeferredColorDeletionQueue({
    schedule: scheduler.schedule,
    cancel: scheduler.cancel,
    onPendingChange: () => {},
    onCommit: (ids) => commits.push(ids),
  });

  queue.queue("same-color");
  queue.queue("same-color");
  const [timer] = scheduler.pendingIds();
  scheduler.run(timer);

  assert.deepEqual(commits, [["same-color"]]);
});

test("disposing the delete queue cancels its pending commit", () => {
  const scheduler = createFakeScheduler();
  const commits = [];
  const queue = createDeferredColorDeletionQueue({
    schedule: scheduler.schedule,
    cancel: scheduler.cancel,
    onPendingChange: () => {},
    onCommit: (ids) => commits.push(ids),
  });

  queue.queue("first");
  const [timer] = scheduler.pendingIds();
  queue.dispose();
  scheduler.run(timer);

  assert.deepEqual(commits, []);
});
