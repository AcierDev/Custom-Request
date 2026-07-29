import assert from "node:assert/strict";
import test from "node:test";
import {
  applyStepHeaderMetadata,
  createStepExportMetadata,
} from "./stepMetadata.ts";

const EXPORTED_AT = new Date(2026, 6, 28, 9, 7, 6);
const UTF8_ENCODING = "utf8";
const SAMPLE_STEP = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('Open CASCADE Model'),'2;1');
FILE_NAME('Open CASCADE Shape Model','2026-07-28T09:06:00',('Author'),(
    'Open CASCADE'),'Open CASCADE STEP processor 7.6','Open CASCADE 7.6'
  ,'Unknown');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;
DATA;
ENDSEC;
END-ISO-10303-21;
`;

test("uses one local export date for the STEP filename and metadata", () => {
  const metadata = createStepExportMetadata(EXPORTED_AT);

  assert.equal(
    metadata.description,
    "Editable Everwood Art model exported from the Viewer",
  );
  assert.equal(
    metadata.filename,
    "everwood-art-2026-07-28-0907.step",
  );
  assert.equal(metadata.filenameStamp, "2026-07-28-0907");
  assert.equal(metadata.exportedAtIso, EXPORTED_AT.toISOString());
});

test("replaces generic STEP headers and safely escapes metadata text", () => {
  const metadata = {
    ...createStepExportMetadata(EXPORTED_AT),
    description: "Everwood's editable model",
  };
  const rewritten = new TextDecoder(UTF8_ENCODING).decode(
    applyStepHeaderMetadata(
      new TextEncoder().encode(SAMPLE_STEP),
      metadata,
    ),
  );

  assert.match(
    rewritten,
    /FILE_DESCRIPTION\(\('Everwood''s editable model'\),'2;1'\);/,
  );
  assert.match(
    rewritten,
    /FILE_NAME\('everwood-art-2026-07-28-0907\.step','2026-07-28T16:07:06\.000Z'/,
  );
  assert.equal(rewritten.includes("Open CASCADE Model"), false);
  assert.equal(rewritten.includes("Open CASCADE Shape Model"), false);
  assert.equal(rewritten.includes("FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));"), true);
  assert.equal(rewritten.includes("END-ISO-10303-21;"), true);
});

test("rejects STEP data without writable header records", () => {
  const metadata = createStepExportMetadata(EXPORTED_AT);
  const bytes = new TextEncoder().encode(
    "ISO-10303-21;\nHEADER;\nENDSEC;\nEND-ISO-10303-21;",
  );

  assert.throws(
    () => applyStepHeaderMetadata(bytes, metadata),
    /metadata records/i,
  );
});
