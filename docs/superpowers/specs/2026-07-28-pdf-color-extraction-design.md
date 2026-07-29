# PDF Color Extraction Design

## Goal

Let the palette page's existing image color extractor accept PDF files without changing the downstream picking, dominant-color, or palette workflows.

## Behavior

- Accept image files and PDFs from the file picker or drag-and-drop area.
- Keep clipboard paste image-only.
- Render the first PDF page in the browser, then pass its image data URL into the existing extractor.
- Keep the existing 10 MB upload limit for both images and PDFs.
- Bound PDF rendering to a named maximum dimension so large pages do not create oversized canvases.
- Show a busy state while a file is read or a PDF is rendered.
- Explain in the upload UI that PDF extraction uses the first page.
- Reject unsupported, unreadable, empty, or password-protected PDFs with a concise error toast.

## Architecture

`fileUpload.ts` owns file classification, size validation, image reading, and the shared upload result. `renderPdfFirstPage.ts` lazy-loads PDF.js only for PDFs, configures its bundled worker, renders page one to a white-backed canvas, and returns a PNG data URL. `ImageUploader.tsx` owns the async loading state and upload-area copy. The extractor continues receiving a normal image data URL, so its store shape and color logic remain unchanged.

PDF.js is pinned to a Node-20-compatible release. Its worker is emitted by the application bundle rather than fetched from a third-party CDN.

## Error Handling

The conversion boundary throws user-safe messages. The uploader reports them through the existing toast system and always restores its idle state. A failed upload leaves the current extractor image untouched.

## Verification

- Unit-test supported file classification, size validation, and bounded PDF scale calculation.
- Confirm those tests fail before implementation and pass afterward.
- Run the full Node test suite, TypeScript, diff checks, and a production build.
- In a browser, upload a PDF and confirm its first page appears with recommended colors; then confirm a normal image still works.
