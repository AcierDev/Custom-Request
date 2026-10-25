"""Builds public/textures/grain-relief-atlas.png for the website viewer.

Same painted end-grain model as the Blender renders (grain_relief.py, settings from
config.json "surface"): each 4x4 cell is one tile's soft relief height, bright = raised
latewood ring. The viewer uses it as a faint color modulation and as its bump map.

Run: /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
       --python scripts/blender/make_web_grain_atlas.py
"""
import sys
from pathlib import Path

import bpy
import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
from grain_relief import build_relief  # noqa: E402
from schema import CONFIG  # noqa: E402

PUBLIC = SCRIPT_DIR.parent.parent / 'public'
SOURCE = PUBLIC / CONFIG['assets']['grain']
OUTPUT = PUBLIC / 'textures/grain-relief-atlas.png'
LUMINANCE = np.array([0.2126, 0.7152, 0.0722])
UNUSED_CELL_HEIGHT = 1.0  # blank cells stay white so a stray sample cannot darken a tile

S = CONFIG['surface']
source = bpy.data.images.load(str(SOURCE), check_existing=False)
source.colorspace_settings.name = 'Non-Color'
width, height = source.size
pixels = np.empty(width * height * 4, np.float32)
source.pixels.foreach_get(pixels)
rgb = pixels.reshape(height, width, 4)[::-1, :, :3]  # Blender stores the bottom row first.
relief, info = build_relief(rgb @ LUMINANCE, S, S['grain_relief_cells_used'])

grid, used = S['grain_relief_atlas_grid'], S['grain_relief_cells_used']
size = height // grid
out = relief[..., 1].copy()
for index in range(used, grid * grid):
    row, col = divmod(index, grid)
    out[row * size:(row + 1) * size, col * size:(col + 1) * size] = UNUSED_CELL_HEIGHT

image = bpy.data.images.new('grain-relief-atlas', width, height, alpha=False, float_buffer=False)
image.colorspace_settings.name = 'Non-Color'
gray = out[::-1].astype(np.float32)
image.pixels.foreach_set(np.dstack([gray, gray, gray, np.ones_like(gray)]).ravel())
image.filepath_raw = str(OUTPUT)
image.file_format = 'PNG'
image.save()
print(f'Wrote {OUTPUT} ({width}x{height}); rings per cell: {[cell["rings"] for cell in info]}')
