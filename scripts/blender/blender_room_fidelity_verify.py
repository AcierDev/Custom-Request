"""Check room light containment without rendering or opening a .blend file."""
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

import bpy
from mathutils import Vector
from room import architecture
from schema import CONFIG

ROOT = SCRIPT_DIR.parents[1]
ROOM, WINDOW = CONFIG['room'], CONFIG['window']
CHECK = {
    'ray_origin_y': -1.0,
    'ray_height': 1.5,
    'window_span_fraction': 0.25,
    'wall_hit_tolerance': 0.01,
}

bpy.ops.wm.read_factory_settings(use_empty=True)
architecture(ROOT / 'public', ROOM['width'], ROOM['height'])
bpy.context.view_layer.update()
depsgraph = bpy.context.evaluated_depsgraph_get()

hit, location, _, _, wall, _ = bpy.context.scene.ray_cast(
    depsgraph, Vector((0, CHECK['ray_origin_y'], CHECK['ray_height'])),
    Vector((0, -1, 0)), distance=ROOM['depth'] + ROOM['wall_thickness'])
assert hit, 'Outdoor skylight reaches the artwork through the missing wall behind the camera.'
assert abs(location.y + ROOM['depth']) <= CHECK['wall_hit_tolerance']
assert not wall.visible_camera, 'The enclosure must not block wider artwork camera positions.'
assert wall.visible_shadow and wall.visible_diffuse and wall.visible_glossy

window_y = WINDOW['far_y'] + (WINDOW['near_y'] - WINDOW['far_y']) * CHECK['window_span_fraction']
window_z = (WINDOW['top'] + WINDOW['bottom']) / 2
hit, *_ = bpy.context.scene.ray_cast(depsgraph, Vector((0, window_y, window_z)),
    Vector((-1, 0, 0)), distance=ROOM['width'])
assert not hit, 'Closing the enclosure must preserve the daylight window opening.'
print('BLENDER_ROOM_LIGHT_CONTAINMENT_PASSED — no image rendered or .blend loaded')
