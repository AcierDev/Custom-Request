export type UploadKind = "image" | "pdf";
export type UploadFailureCode =
  | "unsupported"
  | "too-large"
  | "unreadable";

const BYTES_PER_KILOBYTE = 1_024;
const KILOBYTES_PER_MEGABYTE = 1_024;
const PDF_FILE_EXTENSION = ".pdf";

export const FILE_UPLOAD_CONFIG = {
  maxSizeMegabytes: 10,
  pdfMimeType: "application/pdf",
  fileInputAccept: "image/*,application/pdf,.pdf",
} as const;

export const PDF_RENDER_CONFIG = {
  firstPageNumber: 1,
  baseScale: 2,
  maxDimensionPx: 2_048,
  backgroundColor: "#ffffff",
  outputMimeType: "image/png",
} as const;

const MAX_UPLOAD_SIZE_BYTES =
  FILE_UPLOAD_CONFIG.maxSizeMegabytes *
  KILOBYTES_PER_MEGABYTE *
  BYTES_PER_KILOBYTE;

interface UploadIdentity {
  name: string;
  type: string;
}

interface UploadCandidate extends UploadIdentity {
  size: number;
}

type UploadValidation =
  | { ok: true; kind: UploadKind }
  | { ok: false; reason: Extract<UploadFailureCode, "unsupported" | "too-large"> };

interface PdfViewport {
  width: number;
  height: number;
}

interface ExtractableFileLoaders {
  readImageFile: (file: File) => Promise<string>;
  renderPdfFirstPage: (file: File) => Promise<string>;
}

export class UploadFileError extends Error {
  readonly code: UploadFailureCode;

  constructor(code: UploadFailureCode, message: string) {
    super(message);
    this.name = "UploadFileError";
    this.code = code;
  }
}

export function getUploadKind(file: UploadIdentity): UploadKind | null {
  if (file.type.startsWith("image/")) return "image";
  if (
    file.type === FILE_UPLOAD_CONFIG.pdfMimeType ||
    file.name.toLowerCase().endsWith(PDF_FILE_EXTENSION)
  ) {
    return "pdf";
  }

  return null;
}

export function validateUploadFile(
  file: UploadCandidate,
): UploadValidation {
  const kind = getUploadKind(file);
  if (!kind) return { ok: false, reason: "unsupported" };
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return { ok: false, reason: "too-large" };
  }

  return { ok: true, kind };
}

export function getPdfRenderScale(viewport: PdfViewport): number {
  const longestDimension = Math.max(viewport.width, viewport.height);
  const boundedScale =
    PDF_RENDER_CONFIG.maxDimensionPx / longestDimension;

  return Math.min(PDF_RENDER_CONFIG.baseScale, boundedScale);
}

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        resolve(result);
        return;
      }

      reject(
        new UploadFileError("unreadable", "Could not read that image file."),
      );
    };
    reader.onerror = () => {
      reject(
        new UploadFileError("unreadable", "Could not read that image file."),
      );
    };
    reader.readAsDataURL(file);
  });
}

const DEFAULT_FILE_LOADERS: ExtractableFileLoaders = {
  readImageFile,
  renderPdfFirstPage: async (file) => {
    const pdfRenderer = await import("./renderPdfFirstPage");
    return pdfRenderer.renderPdfFirstPage(file);
  },
};

export async function loadExtractableFile(
  file: File,
  loaders: ExtractableFileLoaders = DEFAULT_FILE_LOADERS,
): Promise<string> {
  const validation = validateUploadFile(file);
  if (!validation.ok) {
    const message =
      validation.reason === "too-large"
        ? `Files must be ${FILE_UPLOAD_CONFIG.maxSizeMegabytes} MB or smaller.`
        : "Please select an image or PDF file.";
    throw new UploadFileError(validation.reason, message);
  }

  return validation.kind === "pdf"
    ? loaders.renderPdfFirstPage(file)
    : loaders.readImageFile(file);
}
