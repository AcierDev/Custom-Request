import type { ArtSnapshot } from "../ar/artSnapshot.ts";
import { STEP_EXPORT_CONFIG } from "./stepConfig.ts";
import type {
  StepWorkerRequest,
  StepWorkerResponse,
} from "./stepWorkerProtocol.ts";

interface StepWorker {
  onmessage: ((event: MessageEvent<StepWorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: StepWorkerRequest): void;
  terminate(): void;
}

export interface StepDownloadOptions {
  workerFactory?: () => StepWorker;
  requestIdFactory?: () => string;
  createObjectUrl?: (blob: Blob) => string;
  revokeObjectUrl?: (url: string) => void;
  download?: (url: string, filename: string) => void;
}

const WORKER_TYPE: WorkerOptions["type"] = "module";
const HIDDEN_DISPLAY = "none";
const EMPTY_ERROR_MESSAGE = "";

const createStepWorker = (): StepWorker =>
  new Worker(new URL("./stepExport.worker.ts", import.meta.url), {
    type: WORKER_TYPE,
  });

const createRequestId = (): string => crypto.randomUUID();

const triggerDownload = (url: string, filename: string): void => {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = HIDDEN_DISPLAY;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
};

export function generateStepDownload(
  snapshot: ArtSnapshot,
  options: StepDownloadOptions = {},
): Promise<void> {
  const worker = (options.workerFactory ?? createStepWorker)();
  const requestId = (options.requestIdFactory ?? createRequestId)();
  const createObjectUrl =
    options.createObjectUrl ?? URL.createObjectURL.bind(URL);
  const revokeObjectUrl =
    options.revokeObjectUrl ?? URL.revokeObjectURL.bind(URL);
  const download = options.download ?? triggerDownload;

  return new Promise<void>((resolve, reject) => {
    let completed = false;

    const finish = (
      error: Error | null,
      objectUrl: string | null = null,
    ): void => {
      if (completed) return;
      completed = true;
      if (objectUrl) revokeObjectUrl(objectUrl);
      worker.terminate();
      if (error) reject(error);
      else resolve();
    };

    worker.onmessage = ({ data }) => {
      if (data.requestId !== requestId || completed) return;
      if (data.kind === "error") {
        finish(new Error(data.message));
        return;
      }

      let objectUrl: string | null = null;
      try {
        const blob = new Blob([data.buffer], {
          type: STEP_EXPORT_CONFIG.mediaType,
        });
        objectUrl = createObjectUrl(blob);
        download(objectUrl, data.filename);
        finish(null, objectUrl);
      } catch (error) {
        finish(
          error instanceof Error
            ? error
            : new Error(STEP_EXPORT_CONFIG.defaultErrorMessage),
          objectUrl,
        );
      }
    };

    worker.onerror = (event) => {
      const message =
        event.message.trim() || STEP_EXPORT_CONFIG.defaultErrorMessage;
      finish(new Error(message));
    };

    try {
      worker.postMessage({
        kind: "generate",
        requestId,
        snapshot,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : EMPTY_ERROR_MESSAGE;
      finish(
        new Error(
          message.trim() || STEP_EXPORT_CONFIG.defaultErrorMessage,
        ),
      );
    }
  });
}
