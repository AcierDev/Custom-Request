# PDF Color Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Accept PDFs in the palette image-color extractor by rendering their first page into the existing image workflow.

**Architecture:** Add pure upload-validation and PDF-sizing helpers, a lazy browser-only PDF renderer, and async loading UI in the existing uploader. Keep the extractor store and color-analysis pipeline image-data-URL based.

**Tech Stack:** Next.js 16, React 19, TypeScript, PDF.js, Node test runner

## Global Constraints

- Both images and PDFs use the existing 10 MB upload limit.
- PDFs render only their first page.
- PDF rendering is bounded by a named maximum canvas dimension.
- The PDF.js worker is bundled locally; no runtime CDN is used.
- Clipboard paste remains image-only.

---

### Task 1: Define upload and PDF sizing behavior

**Files:**
- Create: `src/app/palette/components/ImageColorExtractor/fileUpload.test.mjs`
- Create: `src/app/palette/components/ImageColorExtractor/fileUpload.ts`

**Interfaces:**
- Produces: `getUploadKind(file)`, `getUploadValidationError(file)`, and `getPdfRenderScale(viewport)`

- [ ] **Step 1: Write failing tests**

Cover image MIME types, PDF MIME/extension fallback, unsupported files, the shared byte limit, and render scales that preserve small pages while bounding large pages.

- [ ] **Step 2: Verify the tests fail**

Run:

```bash
node --no-warnings --test src/app/palette/components/ImageColorExtractor/fileUpload.test.mjs
```

Expected: failure because `fileUpload.ts` does not exist.

- [ ] **Step 3: Implement the pure helpers**

Use exported named configuration values for MIME types, byte conversion, the upload limit, and maximum render dimension.

- [ ] **Step 4: Verify the tests pass**

Run the Task 1 test command and expect all tests to pass.

### Task 2: Render PDF page one

**Files:**
- Create: `src/app/palette/components/ImageColorExtractor/renderPdfFirstPage.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `getPdfRenderScale(viewport)`
- Produces: `renderPdfFirstPage(file): Promise<string>`

- [ ] **Step 1: Install pinned PDF.js**

Install the Node-20-compatible PDF.js release selected in the design.

- [ ] **Step 2: Implement the browser renderer**

Lazy-load PDF.js, configure its local worker, open the uploaded bytes, render the first page onto a white-backed canvas, and return a PNG data URL. Destroy the PDF document in a `finally` block.

- [ ] **Step 3: Type-check**

Run:

```bash
npx tsc --noEmit
```

Expected: no output and exit code 0.

### Task 3: Connect async uploads to the existing extractor

**Files:**
- Modify: `src/app/palette/components/ImageColorExtractor/fileUpload.ts`
- Modify: `src/app/palette/components/ImageColorExtractor/ImageUploader.tsx`
- Modify: `src/app/palette/components/ImageColorExtractor/index.tsx`

**Interfaces:**
- Produces: `loadExtractableFile(file): Promise<string>`
- Consumes: `renderPdfFirstPage(file)`

- [ ] **Step 1: Add a failing source contract test**

Verify the picker accepts PDF MIME/extension values and the upload copy identifies first-page PDF handling.

- [ ] **Step 2: Verify the contract test fails**

Run the focused test and confirm it fails on the missing PDF UI contract.

- [ ] **Step 3: Implement async upload handling**

Add a processing state, disable repeat selection while processing, show a spinner, update accepted formats/copy, and preserve image clipboard behavior.

- [ ] **Step 4: Verify focused tests and TypeScript**

Run the focused upload tests and `npx tsc --noEmit`.

### Task 4: Verify and ship with all workspace changes

**Files:**
- Modify: `docs/superpowers/plans/2026-07-28-pdf-color-extraction.md`

- [ ] **Step 1: Run all tests**

```bash
node --no-warnings --test $(rg --files -g '*.test.mjs' | sort)
```

- [ ] **Step 2: Run production checks**

```bash
npx tsc --noEmit
git diff --check
npm run build
```

- [ ] **Step 3: Browser-check PDF and image uploads**

Confirm the first PDF page and a normal image both enter the existing picker and produce recommended colors.

- [ ] **Step 4: Commit, push, and verify production**

Commit all settled workspace changes, push the exact branch tip to `origin/main`, wait for the production Vercel deployment, and verify `https://custom.everwood.shop`.
