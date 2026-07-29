declare module "replicad-opencascadejs/src/replicad_with_exceptions.js" {
  import type { OpenCascadeInstance } from "replicad-opencascadejs/src/replicad_with_exceptions";

  export interface OpenCascadeInitOptions {
    locateFile?: (path: string) => string;
  }

  const initializeOpenCascade: (
    options?: OpenCascadeInitOptions,
  ) => Promise<OpenCascadeInstance>;

  export default initializeOpenCascade;
}
