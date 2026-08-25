import type { ArtSnapshot } from "../ar/artSnapshot.ts";

export type StepWorkerRequest = {
  kind: "generate";
  requestId: string;
  snapshot: ArtSnapshot;
  exportedAtIso: string;
};

export type StepWorkerResponse =
  | {
      kind: "success";
      requestId: string;
      filename: string;
      filenameStamp: string;
      description: string;
      exportedAtIso: string;
      buffer: ArrayBuffer;
    }
  | {
      kind: "error";
      requestId: string;
      message: string;
    };
