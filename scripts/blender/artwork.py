import math
import zlib
import bpy
from mathutils import Matrix, Vector
from materials import artwork_material
from schema import CONFIG, validate_package
from scene_tools import bounds

COLLECTION_NAME = 'Everwood / exact artwork'
AXIS_CONVERSION = Matrix.Rotation(math.pi / 2, 4, 'X')


def clear_artwork():
    collection = bpy.data.collections.get(COLLECTION_NAME)
    if collection:
        for obj in list(collection.objects): bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(collection)
    for data in list(bpy.data.meshes):
        if data.name.startswith('Artwork /') and data.users == 0: bpy.data.meshes.remove(data)
    for data in list(bpy.data.materials):
        if data.name.startswith('Artwork /') and data.users == 0: bpy.data.materials.remove(data)


def import_artwork(packet, asset_root):
    validate_package(packet)
    clear_artwork()
    collection = bpy.data.collections.new(COLLECTION_NAME)
    bpy.context.scene.collection.children.link(collection)
    root = bpy.data.objects.new('Artwork / mount', None); collection.objects.link(root)
    materials = [artwork_material(record, asset_root, index) for index, record in enumerate(packet['materials'])]
    geometry_cache = {}
    meshes = []
    for record in packet['objects']:
        material_record = packet['materials'][record['material']]
        flip_v = material_record['texture'] == 'grain'
        key = (record['geometry'], flip_v)
        if key not in geometry_cache:
            source = packet['geometries'][record['geometry']]
            data = bpy.data.meshes.new(f'Artwork / geometry {record["geometry"]} / {flip_v}')
            vertices = list(zip(*[iter(source['positions'])] * 3))
            triangles = list(zip(*[iter(source['triangles'])] * 3))
            data.from_pydata(vertices, [], triangles); data.update()
            uv_layer = data.uv_layers.new(name='Exact grain coordinates')
            # Ring scale lives in the derived relief atlas; zoom stays 1 so arcs keep their curvature.
            zoom = CONFIG['surface']['grain_uv_zoom'] if flip_v else 1
            # Deterministic quarter turn and mirror per tile, so atlas cells repeated across the piece do not line up.
            turn = zlib.crc32(record['name'].encode()) if flip_v and CONFIG['surface']['grain_tile_random_turns'] else 0
            cos_t, sin_t = [(1, 0), (0, 1), (-1, 0), (0, -1)][turn % 4]
            mirror = -1 if turn // 4 % 2 else 1
            us, vs = source['uvs'][0::2], source['uvs'][1::2]
            cu, cv = (min(us) + max(us)) / 2, (min(vs) + max(vs)) / 2
            for loop in data.loops:
                u, v = source['uvs'][loop.vertex_index * 2:loop.vertex_index * 2 + 2]
                du, dv = mirror * (u - cu) / zoom, (v - cv) / zoom
                u, v = cu + cos_t * du - sin_t * dv, cv + sin_t * du + cos_t * dv
                uv_layer.data[loop.index].uv = (u, 1 - v if flip_v else v)
            for polygon in data.polygons: polygon.use_smooth = True
            data.normals_split_custom_set_from_vertices(list(zip(*[iter(source['normals'])] * 3)))
            data.materials.append(materials[record['material']])
            geometry_cache[key] = data
        obj = bpy.data.objects.new(record['name'], geometry_cache[key]); collection.objects.link(obj)
        obj.parent = root
        obj.matrix_world = AXIS_CONVERSION @ Matrix([record['matrix'][row::4] for row in range(4)])
        obj.material_slots[0].link = 'OBJECT'; obj.material_slots[0].material = materials[record['material']]
        obj['artwork_kind'] = record['kind']; obj['paint_hex'] = material_record['colorHex']
        meshes.append(obj)
    low, high = bounds(meshes)
    size = high - low; center = (high + low) / 2
    mount_height = max(CONFIG['room']['art_center_height'], size.z / 2 + CONFIG['room']['art_floor_clearance'])
    root.location = Vector((-center.x, -CONFIG['room']['art_standoff'] - high.y, mount_height - center.z))
    bpy.context.view_layer.update()
    low, high = bounds(meshes)
    root['design_metadata'] = str(packet['metadata'])
    return {'root': root, 'meshes': meshes, 'min': low, 'max': high,
            'width_m': size.x, 'height_m': size.z, 'depth_m': size.y,
            'tile_count': sum(obj['kind'] == 'face' for obj in packet['objects'])}
