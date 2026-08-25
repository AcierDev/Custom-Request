# Fusion Package Metadata and Wood Appearance Design

## Goal

Keep the Viewer’s CAD export editable and correctly scaled in Autodesk Fusion
while adding useful file metadata and an optional wood-grain appearance workflow.

## Format Decision

STEP remains the source of truth. Autodesk Fusion imports STEP as editable solid
bodies, while OBJ and 3MF import as mesh bodies. A textured mesh export would
therefore trade away the user’s earlier editability requirement.

The Viewer will offer two visible actions:

- **Download STEP** downloads the editable AP242 STEP file directly.
- **Fusion + Wood** downloads a ZIP package containing the same STEP file and a
  Fusion Python script with its appearance assets.

Neither action initializes OpenCascade until clicked.

## STEP Metadata

Every generated STEP uses one captured export timestamp for all names and
metadata:

- Description: `Editable Everwood Art model exported from the Viewer`
- Download name: `everwood-art-YYYY-MM-DD-HHmm.step`
- `FILE_DESCRIPTION`: the description above
- `FILE_NAME`: the dated filename and full ISO-8601 export timestamp

The date uses the browser’s local calendar and clock for the filename. The STEP
header stores the same instant as an ISO timestamp. Metadata changes must not
alter the AP242 schema, millimeter units, colors, hierarchy, or geometry.

## Fusion Package

The package name is `everwood-art-fusion-YYYY-MM-DD-HHmm.zip` and contains:

```text
everwood-art-YYYY-MM-DD-HHmm.step
README.txt
EverwoodAppearance/
  EverwoodAppearance.py
  EverwoodAppearance.manifest
  design-manifest.json
  textures/
    ...
```

`design-manifest.json` records the description, export timestamp, backboard
mapping, and each visible square’s exact STEP component name, color, and texture
filename.

When wood grain is enabled in the Viewer, the browser derives compact,
color-tinted texture images from the Viewer’s existing grain atlas. Repeated
color/grain combinations share one image. The backboard uses the existing
plywood source. When grain is disabled, the package preserves the STEP colors
without adding grain overrides.

## Fusion Script

The package includes a normal Fusion Python script and manifest, not a preview
Fusion API or an add-in that runs at startup.

After the user imports the STEP and links the `EverwoodAppearance` folder in
Fusion’s **Scripts and Add-Ins** dialog, running the script:

1. Reads `design-manifest.json` and validates the texture files.
2. Finds `Backboard`, `Squares`, and `Square ###` components by the stable names
   already written into the STEP assembly.
3. Copies each imported body’s existing appearance into the design.
4. Connects the mapped texture image through Fusion’s released appearance APIs.
5. Applies the appearance without changing geometry, component placement, or
   scale.
6. Shows a concise result or error message.

The generated README provides the import and one-time script-linking steps.
Failure to apply an appearance leaves the imported STEP usable and unchanged.

## Implementation Boundaries

- Date formatting, STEP header metadata, package manifests, filenames, and ZIP
  entries are pure, testable helpers.
- STEP generation stays in the existing one-shot Web Worker.
- Texture preparation and ZIP assembly occur only after the user requests the
  Fusion package.
- ZIP support is added as an explicit direct dependency rather than relying on a
  transitive package.
- All numeric limits and image dimensions are named configuration values.

## Verification

Automated checks will prove:

- filename and header description/date use the same injected timestamp;
- apostrophes and STEP header text are escaped safely;
- OpenCascade reads the metadata-enhanced STEP with unchanged millimeter bounds;
- the ZIP contains the STEP, README, script, manifest, and every mapped texture;
- each visible square maps to the correct component and appearance asset;
- generated Python parses with `python3 -m py_compile`;
- existing STEP, paint, square-spacing, palette, TypeScript, and production
  build checks remain green.

A browser test will download both outputs and inspect their contents. Fusion
itself is unavailable in the development environment, so the final handoff will
state that the script is API-validated and syntax-checked but still needs one
smoke test in the Fusion desktop application.

## Sources

- [Autodesk Fusion supported formats](https://help.autodesk.com/view/fusion360/ENU/?caas=caas%2Fsfdcarticles%2Fsfdcarticles%2FFile-formats-supported-by-Fusion-360.html)
- [Autodesk Fusion import behavior](https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/OpeningFilesFromWebPage_UM.htm)
- [Autodesk Fusion appearance APIs](https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/AppearanceTexture.htm)
- [Autodesk Fusion scripts and manifests](https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/WritingDebugging_UM.htm)
