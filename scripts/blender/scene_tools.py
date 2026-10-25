import math
import bpy
from mathutils import Vector
from schema import CONFIG

R, S = CONFIG['room'], CONFIG['surface']


def bounds(objects):
    bpy.context.view_layer.update()
    points = [obj.matrix_world @ Vector(corner) for obj in objects if obj.type == 'MESH' for corner in obj.bound_box]
    if not points: raise ValueError('No mesh bounds available.')
    return Vector(tuple(min(p[a] for p in points) for a in range(3))), Vector(tuple(max(p[a] for p in points) for a in range(3)))


def bevel(obj, amount):
    if not amount: return
    modifier = obj.modifiers.new('Soft manufactured edges', 'BEVEL')
    modifier.width = amount; modifier.segments = R['bevel_segments']
    modifier.limit_method = 'ANGLE'
    normals = obj.modifiers.new('Weighted surface normals', 'WEIGHTED_NORMAL')
    normals.keep_sharp = True


def box(name, size, position, material, radius=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=position)
    obj = bpy.context.object; obj.name = name; obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    bevel(obj, R['edge_bevel'] if radius is None else radius)
    return obj


def cylinder(name, radius, depth, position, material, top_radius=None):
    bpy.ops.mesh.primitive_cone_add(vertices=S['radial_segments'], radius1=radius,
                                   radius2=radius if top_radius is None else top_radius, depth=depth, location=position)
    obj = bpy.context.object; obj.name = name; obj.data.materials.append(material)
    for polygon in obj.data.polygons: polygon.use_smooth = len(polygon.vertices) == 4
    bevel(obj, min(R['edge_bevel'], depth / 4, radius / 4))
    return obj


def curve(name, points, radius, material, cyclic=False):
    data = bpy.data.curves.new(name, 'CURVE'); data.dimensions = '3D'
    data.bevel_depth = radius; data.bevel_resolution = S['tube_resolution']
    spline = data.splines.new('POLY'); spline.points.add(len(points) - 1)
    for target, source in zip(spline.points, points): target.co = (*source, 1)
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, data); bpy.context.collection.objects.link(obj)
    data.materials.append(material)
    return obj


def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def import_asset(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    created = set(bpy.data.objects) - before
    meshes = [obj for obj in created if obj.type == 'MESH']
    for obj in created:
        if obj.type in ('LIGHT', 'CAMERA'): bpy.data.objects.remove(obj, do_unlink=True)
    return meshes


def fit_asset(name, meshes, axis, span, position, rotation=(0, 0, 0)):
    if not meshes: raise ValueError(f'Missing asset meshes: {name}')
    root = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(root)
    for obj in meshes:
        matrix = obj.matrix_world.copy(); obj.parent = root; obj.matrix_world = matrix
    root.rotation_euler = rotation
    low, high = bounds(meshes)
    root.scale *= span / (high[axis] - low[axis])
    low, high = bounds(meshes)
    root.location = Vector(position) - Vector(((low.x + high.x) / 2, (low.y + high.y) / 2, low.z))
    bpy.context.view_layer.update()
    root['room_furniture'] = True
    for obj in meshes: obj['room_furniture'] = True
    return root


def circular_points(radius, z, xy, count):
    return [(xy[0] + math.cos(i / count * math.tau) * radius,
             xy[1] + math.sin(i / count * math.tau) * radius, z) for i in range(count)]
