# Local Blender renders

Blender 4.5.4 LTS is installed on this Mac. This workflow uses Cycles and its Apple M1 Pro GPU, renders one camera angle, saves the image and editable scene, then exits. Nothing stays running between jobs.

## Render a design

1. In the viewer or shared viewer, finish the design and choose **Render file**. This downloads `custom-art.everwood.json` with the actual beveled geometry, selected colors, panel spacing, orientation and room settings.
2. Give Codex that file and say **“Render this design.”** Tests use 480p. Ask for a final image when ready; the final preset is 2560×1440.
3. Each job produces `render.png`, an editable `scene.blend`, and its settings, source design, credits and timing report in a new folder under `output/blender-render/jobs/`.

**Availability:** the Render file button is included in both viewer routes. Downloading exports the design; rendering runs locally on this Mac with Blender.

From the repository directory, the equivalent commands are:

```sh
python3 scripts/blender/render.py "$HOME/Downloads/custom-art.everwood.json"
python3 scripts/blender/render.py "$HOME/Downloads/custom-art.everwood.json" --quality final
```

The first command defaults to an 854×480 preview. For an editable scene without rendering:

```sh
python3 scripts/blender/render.py "$HOME/Downloads/custom-art.everwood.json" --prepare-only
```

`--output /path/to/new-folder` selects a destination. Existing folders are never overwritten. `--blender /path/to/executable` or `BLENDER_BIN` overrides the executable location. Only one local job runs at a time. Ctrl+C, SIGTERM and SIGHUP cancel and clean up the owned Blender process. Progress is available in each job's `render.log`; failures leave `failure.json` and return a nonzero exit status.

## Ready files

- `output/blender-render/room.blend`: reusable furnished room with packed textures and embedded credits.
- `output/blender-render/ready-480p/render.png`: inspected demonstration preview of a 72×36-inch design, not a customer order.
- `output/blender-render/ready-480p/scene.blend`: complete editable demonstration scene.
- `output/blender-render/examples/`: full-size landscape and rotated split-mini test designs.

The latest 480p demonstration rendered in about 14 seconds on this Mac, about 16 seconds including setup and saving. Final-resolution rendering has not been timed. Timing varies with design, lighting, memory pressure and other applications.

## Appearance and accuracy

The export preserves the geometry produced by the existing photo artwork builder: real dimensions in meters, tile bevels, final panel positions, mini sizing, hidden tiles, orientation, grain UVs and selected paint colors. Paint uses the website's semi-gloss material values and one sRGB-to-linear conversion. The local room adds Cycles indirect light, physical shadows, photographed furniture and floor textures, and authored curtains, trim, bookcase and lamp.

The room now includes its wall behind the camera, so outdoor skylight cannot enter through an unintended full-width opening. That wall remains invisible to primary camera rays to accommodate wider artwork. The sofa uses the refined fabric color, neutral sheen and restrained normal strength. These corrections passed geometry and material checks without rendering; the saved demonstration images and `.blend` files still show the earlier setup. The next requested job rebuilds the cached room automatically.

Colors and surface reflectance have not been calibrated against measured physical paint samples. Lighting, wood grain and display settings affect the appearance. Do not describe this as a color proof or a guaranteed photographic match to a specific handmade piece.

## Adjust the room

Scene dimensions, camera, exposure, materials, lighting and preview/final quality live in `scripts/blender/config.json`. No cloud renderer or additional Python dependencies are required. The current GPU is Metal; the log and result explicitly report CPU fallback if Metal is unavailable.

The room template is reused while its configuration, scene scripts and source assets match. Changes rebuild it and preserve the old template as `room-before-update-*.blend`. To customize an individual customer scene, edit that job's `scene.blend`. Template edits persist while its fingerprint stays unchanged; keep authored master scenes separately from the generated cache.

All images needed by the packed `.blend` are included. Preserve `ASSET-CREDITS.md` when sharing scenes or renders. The sofa is © 2021 Wayfair, LLC; Eric Chadwick, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), from [Khronos glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/GlamVelvetSofa). Other imported furniture and floor assets are credited to Poly Haven under CC0. Exact provenance and local adaptations accompany each job in `asset-credits.json`.

## Verification and future work

```sh
node --no-warnings --test src/lib/blender/blenderPackage.test.mjs
python3 -m unittest discover -s scripts/blender -p 'test_*.py'
'/Applications/Blender.app/Contents/MacOS/Blender' --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/blender/blender_room_fidelity_verify.py
node --no-warnings scripts/blender/make-example.mjs
'/Applications/Blender.app/Contents/MacOS/Blender' --background --factory-startup --disable-autoexec --python-exit-code 1 --python scripts/blender/blender_verify.py
```

The room fidelity check tests light containment and the window opening without rendering or loading a `.blend`. Run the full native import check after the room template exists. It verifies actual Blender imports, dimensions, colors, rotated mini panels, stale-art removal, lighting controls, texture packing and credits. The launcher validates transformed geometry and complete PNG pixels before reporting success. Export controls share one component across `/viewer` and `/shared/[id]`; keep both routes aligned.

Before publishing renderer changes, also run the production build and full TypeScript check, and verify the Render file action in both viewer routes with the built-in browser. Keep render tests at 480p and stop any temporary server afterward.

## Art-only renders (website)

`render.py` now defaults to `--scene art`: no furniture or room props, a close-up straight-on camera (50 mm), a soft studio key and fill light, and paint, grain and exposure values from the `art_only` block of `config.json`. Use `--scene room` for the old furnished room. Other options:

- `--quality web` renders 1920x1080 at 64 samples for the website.
- `--skip-scene` writes only the image (the website uses this).
- `--reference-framing` frames like the straight-on Coastal Dream final for side-by-side comparison.

The website sends renders here only when the server runs with `EVERWOOD_BLENDER_WEB_RENDER=1`; otherwise "Save image" uses the in-browser renderer. Jobs run through the shared lock wrapper in `config.json` (`serial_wrapper`) when it is installed. `blender_job.py` carries the `# readonly-safe` marker the wrapper looks for, so keep it saving only its own job folder and this repo's `room.blend` cache.
