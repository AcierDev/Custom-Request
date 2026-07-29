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
  now?: () => Date;
  createObjectUrl?: (blob: Blob) => string;
  revokeObjectUrl?: (url: string) => void;
  download?: (url: string, filename: string) => void;
}

export interface GeneratedStepFile {
  filename: string;
  filenameStamp: string;
  description: string;
  exportedAtIso: string;
  buffer: ArrayBuffer;
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
  return generateStepFile(snapshot, options).then((file) => {
    const createObjectUrl =
      options.createObjectUrl ?? URL.createObjectURL.bind(URL);
    const revokeObjectUrl =
      options.revokeObjectUrl ?? URL.revokeObjectURL.bind(URL);
    const download = options.download ?? triggerDownload;
    let objectUrl: string | null = null;

    try {
      const blob = new Blob([file.buffer], {
        type: STEP_EXPORT_CONFIG.mediaType,
      });
      objectUrl = createObjectUrl(blob);
      download(objectUrl, file.filename);
    } finally {
      if (objectUrl) revokeObjectUrl(objectUrl);
    }
  });
}

export function generateStepFile(
  snapshot: ArtSnapshot,
  options: StepDownloadOptions = {},
): Promise<GeneratedStepFile> {
  const worker = (options.workerFactory ?? createStepWorker)();
  const requestId = (options.requestIdFactory ?? createRequestId)();
  const exportedAtIso = (options.now ?? (() => new Date()))().toISOString();

  return new Promise<GeneratedStepFile>((resolve, reject) => {
    let completed = false;

    const finish = (error: Error | null, file?: GeneratedStepFile): void => {
      if (completed) return;
      completed = true;
      worker.terminate();
      if (error) reject(error);
      else if (file) resolve(file);
      else reject(new Error(STEP_EXPORT_CONFIG.defaultErrorMessage));
    };

    worker.onmessage = ({ data }) => {
      if (data.requestId !== requestId || completed) return;
      if (data.kind === "error") {
        finish(new Error(data.message));
        return;
      }

      finish(null, {
        filename: data.filename,
        filenameStamp: data.filenameStamp,
        description: data.description,
        exportedAtIso: data.exportedAtIso,
        buffer: data.buffer,
      });
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
        exportedAtIso,
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
