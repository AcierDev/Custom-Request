export const PALETTE_DELETE_IDLE_MS = 1_500;

type TimerHandle = ReturnType<typeof setTimeout>;

interface DeferredColorDeletionQueueOptions {
  delayMs?: number;
  onPendingChange: (ids: string[]) => void;
  onCommit: (ids: string[]) => void;
  schedule?: (callback: () => void, delayMs: number) => TimerHandle;
  cancel?: (handle: TimerHandle) => void;
}

export function createDeferredColorDeletionQueue({
  delayMs = PALETTE_DELETE_IDLE_MS,
  onPendingChange,
  onCommit,
  schedule = setTimeout,
  cancel = clearTimeout,
}: DeferredColorDeletionQueueOptions) {
  const pendingIds = new Set<string>();
  let timer: TimerHandle | undefined;

  const commit = () => {
    timer = undefined;
    const ids = [...pendingIds];
    pendingIds.clear();
    onPendingChange([]);

    if (ids.length > 0) {
      onCommit(ids);
    }
  };

  return {
    queue(id: string) {
      pendingIds.add(id);
      onPendingChange([...pendingIds]);

      if (timer !== undefined) {
        cancel(timer);
      }

      timer = schedule(commit, delayMs);
    },
    dispose() {
      if (timer !== undefined) {
        cancel(timer);
      }

      timer = undefined;
      pendingIds.clear();
    },
  };
}
