import {
  getPdfRenderScale,
  PDF_RENDER_CONFIG,
  UploadFileError,
} from "./fileUpload";

const PDF_READ_ERROR_MESSAGE =
  "Could not read that PDF. It may be damaged or password-protected.";
const UNIT_RENDER_SCALE = 1;

export async function renderPdfFirstPage(file: File): Promise<string> {
  try {
    const pdfjs = await import("pdfjs-dist/webpack.mjs");
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
    });
    const pdfDocument = await loadingTask.promise;

    try {
      const page = await pdfDocument.getPage(
        PDF_RENDER_CONFIG.firstPageNumber,
      );
      const unscaledViewport = page.getViewport({
        scale: UNIT_RENDER_SCALE,
      });
      const viewport = page.getViewport({
        scale: getPdfRenderScale(unscaledViewport),
      });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      await page.render({
        canvas,
        viewport,
        background: PDF_RENDER_CONFIG.backgroundColor,
      }).promise;
      page.cleanup();

      return canvas.toDataURL(PDF_RENDER_CONFIG.outputMimeType);
    } finally {
      await pdfDocument.destroy();
    }
  } catch (error) {
    if (error instanceof UploadFileError) throw error;
    throw new UploadFileError("unreadable", PDF_READ_ERROR_MESSAGE);
  }
}
