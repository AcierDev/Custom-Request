import assert from "node:assert/strict";
import test from "node:test";
import * as fileUpload from "./fileUpload.ts";

const {
  getPdfRenderScale,
  getUploadKind,
  validateUploadFile,
} = fileUpload;

const TEN_MEGABYTES_IN_BYTES = 10 * 1024 * 1024;

test("classifies browser images and PDFs by MIME type", () => {
  assert.equal(
    getUploadKind({ name: "sample.webp", type: "image/webp" }),
    "image",
  );
  assert.equal(
    getUploadKind({ name: "palette.pdf", type: "application/pdf" }),
    "pdf",
  );
});

test("recognizes a PDF extension when the browser omits its MIME type", () => {
  assert.equal(getUploadKind({ name: "PALETTE.PDF", type: "" }), "pdf");
});

test("rejects unsupported uploads", () => {
  assert.deepEqual(
    validateUploadFile({
      name: "notes.txt",
      type: "text/plain",
      size: 12,
    }),
    { ok: false, reason: "unsupported" },
  );
});

test("applies the shared ten-megabyte limit to images and PDFs", () => {
  assert.deepEqual(
    validateUploadFile({
      name: "palette.pdf",
      type: "application/pdf",
      size: TEN_MEGABYTES_IN_BYTES,
    }),
    { ok: true, kind: "pdf" },
  );
  assert.deepEqual(
    validateUploadFile({
      name: "palette.pdf",
      type: "application/pdf",
      size: TEN_MEGABYTES_IN_BYTES + 1,
    }),
    { ok: false, reason: "too-large" },
  );
});

test("renders ordinary PDF pages sharply without exceeding the base scale", () => {
  assert.equal(getPdfRenderScale({ width: 600, height: 800 }), 2);
});

test("reduces the PDF scale when a page would exceed the canvas bound", () => {
  assert.equal(getPdfRenderScale({ width: 2_000, height: 1_000 }), 1.024);
});

test("routes a PDF through the PDF renderer", async () => {
  const result = await fileUpload.loadExtractableFile(
    {
      name: "palette.pdf",
      type: "application/pdf",
      size: 128,
    },
    {
      readImageFile: async () => "data:image/png;base64,image",
      renderPdfFirstPage: async () => "data:image/png;base64,pdf",
    },
  );

  assert.equal(result, "data:image/png;base64,pdf");
});

test("keeps ordinary images on the existing image-reader path", async () => {
  const result = await fileUpload.loadExtractableFile(
    {
      name: "palette.png",
      type: "image/png",
      size: 128,
    },
    {
      readImageFile: async () => "data:image/png;base64,image",
      renderPdfFirstPage: async () => "data:image/png;base64,pdf",
    },
  );

  assert.equal(result, "data:image/png;base64,image");
});

test("rejects oversized files before conversion", async () => {
  await assert.rejects(
    fileUpload.loadExtractableFile(
      {
        name: "palette.pdf",
        type: "application/pdf",
        size: TEN_MEGABYTES_IN_BYTES + 1,
      },
      {
        readImageFile: async () => "unexpected image",
        renderPdfFirstPage: async () => "unexpected PDF",
      },
    ),
    (error) => error?.code === "too-large",
  );
});
