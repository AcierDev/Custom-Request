"""Reusable room authored in meters. All assets stay on this computer."""
import math
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
from schema import CONFIG
from materials import principled, fabric, wood, floor_material, noise_bump, linear_hex
from scene_tools import box, cylinder, curve, aim, import_asset, fit_asset, bounds, circular_points

R, W, F, B, L, C, LIGHT, S = (CONFIG[key] for key in ('room', 'window', 'furniture', 'shelf', 'lamp', 'camera', 'light', 'surface'))
DECOR = {
    'top_books': [('gardens', 0.10, 0.266), ('field_notes', 0.143, 0.24), ('collected_poems', 0.18, 0.219)],
    'lower_books': [('light_space', -0.25, 0.286), ('journeys', -0.208, 0.251), ('modern_spaces', -0.165, 0.314)],
    'middle_books': [('natural_forms', -0.18, 0.30), ('habitat', -0.19, 0.31)],
    'middle_frame_x': 0.19, 'middle_frame_height': 0.272,
    'shelf_vase_x': -0.22, 'shelf_vase_height': 0.285,
    'bowl_x': 0.19, 'stack_rotation': (0, math.pi / 2, 0.065),
}


def curtains(width, material, metal):
    x = -width / 2 + W['curtain_inset']
    for center in (W['near_y'] + W['curtain_width'] / 3, W['far_y'] - W['curtain_width'] / 3):
        vertices, faces = [], []
        nu, nv = W['horizontal_segments'], W['vertical_segments']
        for row in range(nv + 1):
            v = row / nv
            for column in range(nu + 1):
                u = column / nu
                fold = math.sin(u * math.tau * W['folds']) * W['fold_depth']
                vertices.append((x + fold * (1 + (1 - v) * W['fold_depth']),
                                 center + (u - 0.5) * W['curtain_width'],
                                 W['curtain_bottom'] + v * (W['curtain_top'] - W['curtain_bottom'])
                                 + (1 - v) * W['hem_radius'] * math.cos(u * math.tau * W['folds'])))
        for row in range(nv):
            for column in range(nu):
                start = row * (nu + 1) + column
                faces.append((start, start + 1, start + nu + 2, start + nu + 1))
        mesh = bpy.data.meshes.new('Linen folds'); mesh.from_pydata(vertices, [], faces); mesh.update()
        obj = bpy.data.objects.new('Room / linen curtain', mesh); bpy.context.collection.objects.link(obj)
        mesh.materials.append(material)
        for face in mesh.polygons: face.use_smooth = True
        solidify = obj.modifiers.new('Real cloth thickness', 'SOLIDIFY'); solidify.thickness = W['cloth_thickness']
        curve('Room / sewn curtain hem', vertices[:nu + 1], W['hem_radius'], material)
    curve('Room / curtain rail', [(x, W['far_y'] - W['rod_overhang'], W['curtain_top']),
                                 (x, W['near_y'] + W['rod_overhang'], W['curtain_top'])], W['rod_radius'], metal)


def architecture(asset_root, width, height):
    wall, shader = principled('Room / selected wall paint', R['wall_color'], R['wall_roughness'])
    noise_bump(wall, shader, S['fabric_frequency'], R['wall_bump'])
    ceiling, _ = principled('Room / ceiling', R['ceiling_color'], R['wall_roughness'])
    trim, _ = principled('Room / painted trim', R['trim_color'], S['fabric_roughness'])
    frame, _ = principled('Room / dark window metal', W['frame_color'], L['metal_roughness'], L['metalness'])
    t, depth = R['wall_thickness'], R['depth']
    box('Room / back wall', (width, t, height), (0, t / 2, height / 2), wall)
    box('Room / right wall', (t, depth, height), (width / 2 + t / 2, -depth / 2, height / 2), wall)
    x = -width / 2 - t / 2
    box('Room / below window', (t, depth, W['bottom']), (x, -depth / 2, W['bottom'] / 2), wall)
    box('Room / above window', (t, depth, height - W['top']), (x, -depth / 2, (height + W['top']) / 2), wall)
    box('Room / rear window pier', (t, -W['near_y'], W['top'] - W['bottom']),
        (x, W['near_y'] / 2, (W['top'] + W['bottom']) / 2), wall)
    box('Room / front window pier', (t, depth + W['far_y'], W['top'] - W['bottom']),
        (x, (-depth + W['far_y']) / 2, (W['top'] + W['bottom']) / 2), wall)
    box('Room / ceiling', (width, depth, t), (0, -depth / 2, height + t / 2), ceiling)
    floor = box('Room / oak floor', (width, depth, R['floor_thickness']), (0, -depth / 2, -R['floor_thickness'] / 2), floor_material(asset_root), 0)
    for loop in floor.data.loops:
        point = floor.matrix_world @ floor.data.vertices[loop.vertex_index].co
        floor.data.uv_layers.active.data[loop.index].uv = (point.x / R['floor_tile_meters'], point.y / R['floor_tile_meters'])
    for name, size, location in [
        ('back', (width, R['baseboard_depth'], R['baseboard_height']), (0, -R['baseboard_depth'] / 2, R['baseboard_height'] / 2)),
        ('left', (R['baseboard_depth'], depth, R['baseboard_height']), (-width / 2 + R['baseboard_depth'] / 2, -depth / 2, R['baseboard_height'] / 2)),
        ('right', (R['baseboard_depth'], depth, R['baseboard_height']), (width / 2 - R['baseboard_depth'] / 2, -depth / 2, R['baseboard_height'] / 2))]:
        box('Room / baseboard ' + name, size, location, trim)
    for y in (W['near_y'], W['far_y'], (W['near_y'] + W['far_y']) / 2):
        box('Room / window vertical', (W['frame_depth'], W['frame_width'], W['top'] - W['bottom']),
            (-width / 2, y, (W['top'] + W['bottom']) / 2), frame)
    for z in (W['bottom'], W['top']):
        box('Room / window rail', (W['frame_depth'], W['near_y'] - W['far_y'], W['frame_width']),
            (-width / 2, (W['near_y'] + W['far_y']) / 2, z), frame)
    box('Room / window sill', (W['sill_depth'], W['near_y'] - W['far_y'], W['sill_height']),
        (-width / 2 + W['sill_depth'] / 3, (W['near_y'] + W['far_y']) / 2, W['bottom']), trim)
    curtains(width, fabric('Room / linen curtains', W['cloth_color']), frame)


def lamp():
    x, y, _ = L['position']
    metal, _ = principled('Lamp / brushed aged brass', L['metal_color'], L['metal_roughness'], L['metalness'])
    cloth = fabric('Lamp / woven linen', L['shade_color'])
    cylinder('Lamp / weighted base', L['base_radius'], L['base_height'], (x, y, L['base_height'] / 2), metal)
    cylinder('Lamp / turned stem', L['stem_radius'], L['height'] - L['base_height'], (x, y, (L['height'] + L['base_height']) / 2), metal)
    vertices, faces = [], []
    count = L['shade_segments']
    for z, radius in [(L['shade_bottom'], L['shade_bottom_radius']), (L['shade_top'], L['shade_top_radius'])]:
        vertices.extend(circular_points(radius, z, (x, y), count))
    for index in range(count): faces.append((index, (index + 1) % count, (index + 1) % count + count, index + count))
    mesh = bpy.data.meshes.new('Lamp / open shade'); mesh.from_pydata(vertices, [], faces); mesh.update()
    obj = bpy.data.objects.new('Lamp / linen shade', mesh); bpy.context.collection.objects.link(obj)
    mesh.materials.append(cloth)
    for polygon in mesh.polygons: polygon.use_smooth = True
    thickness = obj.modifiers.new('Shade fabric thickness', 'SOLIDIFY'); thickness.thickness = L['shade_thickness']
    for start in (0, count): curve('Lamp / bound shade rim', vertices[start:start + count], L['shade_seam_radius'], cloth, True)
    for angle in (0, math.tau / 3, math.tau * 2 / 3):
        curve('Lamp / internal shade support', [(x, y, L['shade_top']),
              (x + math.cos(angle) * L['shade_top_radius'], y + math.sin(angle) * L['shade_top_radius'], L['shade_top'])], L['shade_seam_radius'], metal)
    bulb, shader = principled('Lamp / frosted bulb', '#fff5e0', L['metal_roughness'])
    shader.inputs['Emission Color'].default_value = (*linear_hex(LIGHT['lamp_color']), 1)
    shader.inputs['Emission Strength'].default_value = LIGHT['bulb_emission']
    bpy.ops.mesh.primitive_uv_sphere_add(segments=S['radial_segments'], radius=L['bulb_radius'], location=(x, y, L['bulb_height']))
    bpy.context.object.name = 'Lamp / bulb'; bpy.context.object.data.materials.append(bulb)
    for face in bpy.context.object.data.polygons: face.use_smooth = True
    light = bpy.data.lights.new('Lamp / warm practical', 'POINT'); light.energy = LIGHT['lamp_watts']
    light.color = linear_hex(LIGHT['lamp_color']); light.shadow_soft_size = LIGHT['light_radius']
    obj = bpy.data.objects.new(light.name, light); bpy.context.collection.objects.link(obj); obj.location = (x, y, L['bulb_height'])
    cord, _ = principled('Lamp / cloth cord', '#37312a', S['fabric_roughness'])
    curve('Lamp / power cord', [(x, y, L['cord_radius']), (x + L['base_radius'], y + L['cord_length'] / 2, L['cord_radius']),
                               (x + L['base_radius'], -R['baseboard_depth'], L['cord_radius'])], L['cord_radius'], cord)


def bookcase(asset_root):
    x, y, _ = B['position']; board, width, depth, height = B['board'], B['width'], B['depth'], B['height']
    oak = wood('Bookcase / walnut veneer', B['wood_color'], B['wood_roughness'])
    box('Bookcase / recessed back', (width, B['back_thickness'], height), (x, y + depth / 2, height / 2), oak)
    for side in (-1, 1):
        box('Bookcase / side', (board, depth, height), (x + side * (width - board) / 2, y, height / 2), oak)
    for z in B['levels']: box('Bookcase / solid shelf', (width - board, depth, board), (x, y, z), oak)
    hardware, _ = principled('Bookcase / bronze handles', L['metal_color'], L['metal_roughness'], L['metalness'])
    for side in (-1, 1):
        door_width = (width - board * 2 - B['door_gap']) / 2
        box('Bookcase / lower door', (door_width, board, B['door_height']), (x + side * (door_width + B['door_gap']) / 2, y + B['door_y'], B['door_z']), oak)
        cylinder('Bookcase / inset pull', B['handle_radius'], B['handle_height'],
                 (x + side * board, y + B['handle_y'], B['handle_z']), hardware)
    library = import_asset(asset_root / CONFIG['assets']['books']); used = set()
    def place_book(key, dx, z, span, flat=False):
        meshes = [obj for obj in library if obj.name.startswith('photo_book_' + key)]
        used.update(meshes)
        root = fit_asset('Book / ' + key, meshes, 0 if flat else 2, span,
                         (x + dx, y + B['book_depth'], z), DECOR['stack_rotation'] if flat else (0, 0, 0))
        return bounds(meshes)
    for key, dx, span in DECOR['top_books']:
        place_book(key, dx, B['levels'][3] + B['book_base_clearance'], span)
    for key, dx, span in DECOR['lower_books']:
        place_book(key, dx, B['levels'][1] + B['book_base_clearance'], span)
    stack_z = B['levels'][2] + B['book_base_clearance']
    for key, dx, span in DECOR['middle_books']:
        _, high = place_book(key, dx, stack_z, span, True); stack_z = high.z + F['contact_gap']
    frame = [obj for obj in library if obj.name.startswith('photo-shelf-')]; used.update(frame)
    fit_asset('Bookcase / matted landscape', frame, 2, DECOR['middle_frame_height'],
              (x + DECOR['middle_frame_x'], y + B['book_depth'], B['levels'][2] + B['book_base_clearance']))
    table_book = [obj for obj in library if obj.name.startswith('photo_book_objects')]; used.update(table_book)
    fit_asset('Table / art book', table_book, 0, DECOR['middle_books'][0][2], F['table_book_position'], DECOR['stack_rotation'])
    for obj in library:
        if obj not in used: bpy.data.objects.remove(obj, do_unlink=True)
    vase = import_asset(asset_root / CONFIG['assets']['vase'])
    fit_asset('Bookcase / stoneware', vase, 2, DECOR['shelf_vase_height'],
              (x + DECOR['shelf_vase_x'], y, B['levels'][3] + B['book_base_clearance']))
    bowl, _ = principled('Bookcase / glaze', '#657266', B['wood_roughness'])
    cylinder('Bookcase / small bowl', B['bowl_radius'], B['bowl_height'],
             (x + DECOR['bowl_x'], y + B['book_depth'], B['levels'][1] + B['book_base_clearance'] + B['bowl_height'] / 2), bowl)


def furniture(asset_root):
    before = set(bpy.data.objects)
    rug = fabric('Room / loop pile wool', F['rug_color'])
    box('Room / wool rug', F['rug_size'], F['rug_position'], rug, F['rug_bevel'])
    for side in (-1, 1):
        for index in range(F['fringe_count']):
            x = (index / (F['fringe_count'] - 1) - 0.5) * F['rug_size'][0]
            y = F['rug_position'][1] + side * F['rug_size'][1] / 2
            curve('Rug / woven fringe', [(x, y, F['fringe_radius']), (x, y + side * F['fringe_length'], F['fringe_radius'])], F['fringe_radius'], rug)
    sofa = import_asset(asset_root / CONFIG['assets']['sofa'])
    fit_asset('Room / tailored sofa', sofa, 0, F['sofa_width'], F['sofa_position'])
    for obj in sofa:
        for material in obj.data.materials:
            if 'fabric' in material.name.lower():
                shader = material.node_tree.nodes.get('Principled BSDF')
                shader.inputs['Base Color'].default_value = (*linear_hex(F['sofa_color']), 1)
                shader.inputs['Roughness'].default_value = F['sofa_roughness']
                shader.inputs['Sheen Weight'].default_value = F['sofa_sheen']
    pillows = sorted(import_asset(asset_root / CONFIG['assets']['pillows']), key=lambda obj: obj.name)
    for mesh, position, rotation in zip(pillows, F['pillow_positions'], F['pillow_rotations']):
        fit_asset('Room / loose pillow', [mesh], 2, F['pillow_height'], position, (0, 0, rotation))
    table = import_asset(asset_root / CONFIG['assets']['table'])
    fit_asset('Room / round coffee table', table, 0, F['table_width'], F['table_position'])
    vase = import_asset(asset_root / CONFIG['assets']['vase'])
    fit_asset('Table / ceramic vase', vase, 2, F['vase_height'], F['vase_position'])
    plant = import_asset(asset_root / CONFIG['assets']['plant'])
    fit_asset('Room / natural plant', plant, 2, F['plant_height'], F['plant_position'])
    for obj in plant:
        for material in obj.data.materials:
            if 'leaves' not in material.name.lower() or material.get('everwood_leaf'): continue
            material['everwood_leaf'] = True
            nodes, links = material.node_tree.nodes, material.node_tree.links
            shader = nodes.get('Principled BSDF'); shader.inputs['Roughness'].default_value = F['leaf_roughness']
            translucent = nodes.new('ShaderNodeBsdfTranslucent')
            color_input = shader.inputs['Base Color']
            if color_input.is_linked: links.new(color_input.links[0].from_socket, translucent.inputs['Color'])
            else: translucent.inputs['Color'].default_value = color_input.default_value
            mix = nodes.new('ShaderNodeMixShader'); mix.inputs[0].default_value = F['leaf_translucency']
            links.new(shader.outputs[0], mix.inputs[1]); links.new(translucent.outputs[0], mix.inputs[2])
            output = nodes.get('Material Output')
            if shader.inputs['Alpha'].is_linked:
                masked = nodes.new('ShaderNodeMixShader'); transparent = nodes.new('ShaderNodeBsdfTransparent')
                links.new(shader.inputs['Alpha'].links[0].from_socket, masked.inputs[0])
                links.new(transparent.outputs[0], masked.inputs[1]); links.new(mix.outputs[0], masked.inputs[2])
                links.new(masked.outputs[0], output.inputs['Surface'])
            else: links.new(mix.outputs[0], output.inputs['Surface'])
    bookcase(asset_root); lamp()
    for obj in set(bpy.data.objects) - before:
        if obj.type == 'MESH': obj['room_furniture'] = True


def set_lighting(room_settings, width):
    night = room_settings['timeOfDay'] == 'night'; morning = room_settings['timeOfDay'] == 'morning'
    scene = bpy.context.scene
    wall = bpy.data.materials.get('Room / selected wall paint')
    wall.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (*linear_hex(room_settings['wallColor']), 1)
    if scene.world is None: scene.world = bpy.data.worlds.new('Room / daylight sky')
    scene.world.use_nodes = True
    nodes, links = scene.world.node_tree.nodes, scene.world.node_tree.links
    nodes.clear(); output = nodes.new('ShaderNodeOutputWorld'); background = nodes.new('ShaderNodeBackground')
    sky = nodes.new('ShaderNodeTexSky'); sky.sky_type = 'NISHITA'; sky.sun_disc = LIGHT['sun_disc']
    sky.sun_elevation = LIGHT['sky_elevation']; sky.sun_rotation = LIGHT['sky_rotation']
    background.inputs['Strength'].default_value = LIGHT['sky_night'] if night else LIGHT['sky_day']
    links.new(sky.outputs[0], background.inputs['Color']); links.new(background.outputs[0], output.inputs[0])
    for name in ('Room / window daylight', 'Room / soft room bounce'):
        old = bpy.data.objects.get(name)
        if old is not None:
            light_data = old.data
            bpy.data.objects.remove(old, do_unlink=True)
            if light_data.users == 0: bpy.data.lights.remove(light_data)
    light = bpy.data.lights.new('Room / window daylight', 'AREA'); light.shape = 'RECTANGLE'
    light.size = W['top'] - W['bottom']; light.size_y = W['near_y'] - W['far_y']
    light.energy = LIGHT['night_window_watts'] if night else LIGHT['morning_window_watts'] if morning else LIGHT['day_window_watts']
    light.color = linear_hex(LIGHT['window_temperature_night'] if night else LIGHT['window_temperature_morning'] if morning else LIGHT['window_temperature_day'])
    obj = bpy.data.objects.new(light.name, light); scene.collection.objects.link(obj)
    obj.location = (-width / 2 - LIGHT['window_inset'], (W['near_y'] + W['far_y']) / 2, (W['top'] + W['bottom']) / 2)
    aim(obj, (0, 0, R['art_center_height']))
    fill = bpy.data.lights.new('Room / soft room bounce', 'AREA'); fill.shape = 'DISK'; fill.size = LIGHT['fill_size']
    fill.energy = LIGHT['night_fill_watts'] if night else LIGHT['fill_watts']
    obj = bpy.data.objects.new(fill.name, fill); scene.collection.objects.link(obj); obj.location = LIGHT['fill_position']; aim(obj, (0, 0, R['art_center_height']))
    bpy.data.objects['Lamp / warm practical'].data.energy = LIGHT['lamp_watts'] if room_settings['lampOn'] else 0
    bpy.data.materials['Lamp / frosted bulb'].node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value = LIGHT['bulb_emission'] if room_settings['lampOn'] else 0


def build_room(asset_root, width=None, height=None):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    width, height = width or R['width'], height or R['height']
    bpy.context.scene.unit_settings.system = 'METRIC'
    architecture(asset_root, width, height); furniture(asset_root)
    set_lighting({'wallColor': R['wall_color'], 'timeOfDay': 'afternoon', 'lampOn': True}, width)
    bpy.context.scene['room_width'] = width; bpy.context.scene['room_height'] = height
    return bpy.context.scene


def fit_camera(art):
    scene = bpy.context.scene
    data = bpy.data.cameras.new('Room / photograph'); camera = bpy.data.objects.new(data.name, data)
    scene.collection.objects.link(camera); scene.camera = camera
    data.lens = C['lens_mm']; data.sensor_width = C['sensor_width_mm']
    data.clip_start = C['near_clip']; data.clip_end = C['far_clip']
    objects = art['meshes'] + [obj for obj in scene.objects if obj.type == 'MESH' and obj.get('room_furniture')
                             and obj.name not in C['framing_ignore_names']]
    low, high = bounds(objects)
    target_z = max(C['target_height'], (low.z + high.z) / 2)
    points = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    edge = (1 - C['margin']) / 2
    distance = C['minimum_distance']
    for _ in range(C['fit_iterations']):
        camera.location = (C['eye_x'], -distance, max(C['eye_height'], target_z))
        aim(camera, (0, C['target_y'], target_z)); bpy.context.view_layer.update()
        projected = [world_to_camera_view(scene, camera, point) for point in points]
        if all(point.z > 0 and edge <= point.x <= 1 - edge and edge <= point.y <= 1 - edge for point in projected): break
        distance += C['distance_step']
    else: raise ValueError('The artwork is too large to frame with this room preset.')
    focus = (art['min'] + art['max']) / 2
    data.dof.use_dof = True; data.dof.focus_distance = (camera.location - focus).length; data.dof.aperture_fstop = C['f_stop']
    return camera
