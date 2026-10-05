"""Actual Blender import regression, deliberately performs no high-resolution render."""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import bpy
from mathutils import Vector
from schema import CONFIG, load_package, linear_hex
from artwork import import_artwork, COLLECTION_NAME
from scene_tools import import_asset
from room import set_lighting

ROOT = Path(__file__).resolve().parents[2]
EPSILON = 0.00001
LANDSCAPE_METERS = (1.8288, 0.9144)
EXAMPLES = ('example-landscape', 'example-rotated-split-mini')
bpy.ops.wm.read_factory_settings(use_empty=True)
for name in EXAMPLES:
    packet = load_package(ROOT / f'output/blender-render/examples/{name}.everwood.json')
    art = import_artwork(packet, ROOT / 'public')
    assert len(bpy.data.collections[COLLECTION_NAME].objects) == len(packet['objects']) + 1
    assert art['tile_count'] == packet['metadata']['tileCount']
    assert abs(art['width_m'] - (packet['bounds']['max'][0] - packet['bounds']['min'][0])) < EPSILON
    assert abs(art['height_m'] - (packet['bounds']['max'][1] - packet['bounds']['min'][1])) < EPSILON
    for obj, source in zip(art['meshes'], packet['objects']):
        material = obj.material_slots[0].material
        expected = packet['materials'][source['material']]
        assert material['paint_hex'] == expected['colorHex']
        color = material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value
        assert all(abs(color[i] - expected['colorLinear'][i]) < EPSILON for i in range(3))
        assert obj.matrix_world.determinant() > 0
    if name == EXAMPLES[0]:
        assert abs(art['width_m'] - LANDSCAPE_METERS[0]) < EPSILON
        assert abs(art['height_m'] - LANDSCAPE_METERS[1]) < EPSILON
    print('VERIFIED', name, art['tile_count'], art['width_m'], art['height_m'])
furniture = import_asset(ROOT / 'public/photo-room/sofa.glb')
assert furniture and all(obj.type == 'MESH' for obj in furniture)
assert not any(obj.type in ('LIGHT', 'CAMERA') for obj in bpy.context.scene.objects)
template = ROOT / 'output/blender-render/room.blend'
bpy.ops.wm.open_mainfile(filepath=str(template))
light_count = sum(obj.type == 'LIGHT' for obj in bpy.context.scene.objects)
for mode, energy in [('morning', 'morning_window_watts'), ('afternoon', 'day_window_watts'), ('night', 'night_window_watts')]:
    for lamp_on in (False, True):
        settings = {'wallColor': '#567778', 'timeOfDay': mode, 'lampOn': lamp_on}
        set_lighting(settings, bpy.context.scene['room_width'])
        assert sum(obj.type == 'LIGHT' for obj in bpy.context.scene.objects) == light_count, 'Lighting controls duplicated room lights.'
        window = bpy.data.objects.get('Room / window daylight')
        assert window is not None and abs(window.data.energy - CONFIG['light'][energy]) < EPSILON
        assert abs(bpy.data.objects['Lamp / warm practical'].data.energy - (CONFIG['light']['lamp_watts'] if lamp_on else 0)) < EPSILON
        wall = bpy.data.materials['Room / selected wall paint'].node_tree.nodes.get('Principled BSDF')
        assert all(abs(wall.inputs['Base Color'].default_value[i] - linear_hex(settings['wallColor'])[i]) < EPSILON for i in range(3))
assert all(image.packed_file or image.packed_files for image in bpy.data.images if image.source == 'FILE')
assert bpy.data.texts.get('ASSET-CREDITS.md') is not None
print('BLENDER_ROOM_CHECKS_PASSED')
print('BLENDER_IMPORT_CHECKS_PASSED')
