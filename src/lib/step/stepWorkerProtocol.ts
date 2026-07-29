import type { ArtSnapshot } from "../ar/artSnapshot.ts";

export type StepWorkerRequest = {
  kind: "generate";
  requestId: string;
  snapshot: ArtSnapshot;
};

export type StepWorkerResponse =
  | {
      kind: "success";
      requestId: string;
      filename: string;
      buffer: ArrayBuffer;
    }
  | {
      kind: "error";
      requestId: string;
      message: string;
    };
