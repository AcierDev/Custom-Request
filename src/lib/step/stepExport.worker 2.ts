import { buildStepModelPlan } from "./stepModel.ts";
import { exportStepModel } from "./openCascadeExporter.ts";
import { STEP_EXPORT_CONFIG } from "./stepConfig.ts";
import { createStepExportMetadata } from "./stepMetadata.ts";
import type { OpenCascadeInstance } from "replicad-opencascadejs/src/replicad_with_exceptions";
import type {
  StepWorkerRequest,
  StepWorkerResponse,
} from "./stepWorkerProtocol.ts";

interface StepWorkerScope {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<StepWorkerRequest>) => void,
  ): void;
  postMessage(message: StepWorkerResponse, transfer: Transferable[]): void;
  close(): void;
}

interface OpenCascadeRuntimeModule {
  default: (options?: {
    locateFile?: (path: string) => string;
  }) => Promise<OpenCascadeInstance>;
}

const workerScope = self as unknown as StepWorkerScope;
const WASM_FILE_EXTENSION = ".wasm";

const serializeError = (error: unknown): string =>
  error instanceof Error && error.message.trim()
    ? error.message
    : STEP_EXPORT_CONFIG.defaultErrorMessage;

workerScope.addEventListener("message", async ({ data }) => {
  if (data.kind !== "generate") return;

  try {
    const runtimeModule = (await import(
      /* webpackIgnore: true */
      STEP_EXPORT_CONFIG.runtimeModulePublicUrl
    )) as OpenCascadeRuntimeModule;
    const initializeOpenCascade = runtimeModule.default;
    const openCascade = await initializeOpenCascade({
      locateFile: (path) =>
        path.endsWith(WASM_FILE_EXTENSION)
          ? STEP_EXPORT_CONFIG.wasmPublicUrl
          : path,
    });
    const plan = buildStepModelPlan(data.snapshot);
    const metadata = createStepExportMetadata(
      new Date(data.exportedAtIso),
    );
    const result = exportStepModel(openCascade, plan, metadata);
    const buffer = result.bytes.slice().buffer as ArrayBuffer;

    workerScope.postMessage(
      {
        kind: "success",
        requestId: data.requestId,
        filename: result.filename,
        filenameStamp: metadata.filenameStamp,
        description: metadata.description,
        exportedAtIso: metadata.exportedAtIso,
        buffer,
      },
      [buffer],
    );
  } catch (error) {
    workerScope.postMessage(
      {
        kind: "error",
        requestId: data.requestId,
        message: serializeError(error),
      },
      [],
    );
  } finally {
    workerScope.close();
  }
});
