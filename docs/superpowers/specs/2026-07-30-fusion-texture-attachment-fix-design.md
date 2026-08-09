# Fusion Texture Attachment Fix

## Problem

The generated Fusion script finds every imported STEP component and its matching
texture, but reports `Could not attach texture` for every body. The current
script copies the body's imported flat-color appearance and calls
`changeTextureImage` on the texture connection it creates. Fusion accepts the
connection but rejects the bitmap because that imported appearance schema is
not image-texture-capable.

## Design

- Prefer Fusion's current appearance API when available:
  - create a neutral opaque appearance with `design.appearances.add`;
  - assign the generated image through `appearance.colorTexture`;
  - verify that Fusion reports a non-empty attached texture path;
  - apply that appearance to the matching body.
- Reuse a successfully created appearance when the script is run again.
- If the current API is unavailable, retain the existing connected-texture path
  as a compatibility fallback for older Fusion releases.
- If an existing appearance with the generated name cannot accept the texture
  and is unused, remove it before creating the replacement.
- Continue changing appearances only. Geometry, scale, component names, and
  placement remain untouched.

## Testing

Execute the packaged Python script against a Fusion API test double that
reproduces the reported failure: copied STEP appearances reject
`changeTextureImage`, while newly created opaque appearances accept
`colorTexture`. Assert that all mapped bodies receive appearances and that every
assigned image path exists. Retain Python syntax, ZIP-content, TypeScript, full
test-suite, and production-build checks.
