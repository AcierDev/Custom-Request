"""Cycles materials. Selected paint enters as linear sRGB, exactly once."""
import bpy
from schema import CONFIG, linear_hex

S = CONFIG['surface']


def principled(name, color, roughness, metalness=0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    shader = material.node_tree.nodes.get('Principled BSDF')
    rgb = linear_hex(color) if isinstance(color, str) else tuple(color)
    shader.inputs['Base Color'].default_value = (*rgb, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metalness
    return material, shader


def image_node(material, path, non_color=False):
    tree = material.node_tree
    node = tree.nodes.new('ShaderNodeTexImage')
    # Separate color and data images: changing color space must not mutate another material.
    key = str(path) + (':data' if non_color else ':color')
    existing = next((image for image in bpy.data.images if image.get('everwood_source') == key), None)
    if existing is None:
        existing = bpy.data.images.load(str(path), check_existing=False)
        existing['everwood_source'] = key
        existing.colorspace_settings.name = 'Non-Color' if non_color else 'sRGB'
    node.image = existing
    node.interpolation = 'Linear'
    node.extension = 'REPEAT'
    return node


def noise_bump(material, shader, frequency, distance, strength=1):
    nodes, links = material.node_tree.nodes, material.node_tree.links
    coords = nodes.new('ShaderNodeTexCoord')
    mapping = nodes.new('ShaderNodeVectorMath'); mapping.operation = 'MULTIPLY'
    mapping.inputs[1].default_value = frequency
    links.new(coords.outputs['Generated'], mapping.inputs[0])
    noise = nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 1
    noise.inputs['Detail'].default_value = S['noise_detail']
    links.new(mapping.outputs['Vector'], noise.inputs['Vector'])
    bump = nodes.new('ShaderNodeBump'); bump.inputs['Distance'].default_value = distance
    bump.inputs['Strength'].default_value = strength
    links.new(noise.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], shader.inputs['Normal'])
    return noise, bump


def fabric(name, color):
    material, shader = principled(name, color, S['fabric_roughness'])
    shader.inputs['Sheen Weight'].default_value = S['fabric_sheen']
    noise_bump(material, shader, S['fabric_frequency'], S['fabric_bump'])
    return material


def wood(name, color, roughness):
    material, shader = principled(name, color, roughness)
    noise, _ = noise_bump(material, shader, S['wood_frequency'], S['wood_bump'])
    ramp = material.node_tree.nodes.new('ShaderNodeValToRGB')
    rgb = linear_hex(color)
    for element, factor in zip(ramp.color_ramp.elements, (S['wood_dark_factor'], S['wood_light_factor'])):
        element.color = (*(min(1, c * factor) for c in rgb), 1)
    material.node_tree.links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    material.node_tree.links.new(ramp.outputs['Color'], shader.inputs['Base Color'])
    return material


def floor_material(asset_root):
    material, shader = principled('Room / photographed oak floor', '#ffffff', 1)
    for asset, socket, data in [('floor_color', 'Base Color', False), ('floor_roughness', 'Roughness', True)]:
        texture = image_node(material, asset_root / CONFIG['assets'][asset], data)
        material.node_tree.links.new(texture.outputs['Color'], shader.inputs[socket])
    normal_image = image_node(material, asset_root / CONFIG['assets']['floor_normal'], True)
    normal = material.node_tree.nodes.new('ShaderNodeNormalMap')
    normal.inputs['Strength'].default_value = CONFIG['room']['floor_normal_strength']
    material.node_tree.links.new(normal_image.outputs['Color'], normal.inputs['Color'])
    material.node_tree.links.new(normal.outputs['Normal'], shader.inputs['Normal'])
    return material


def artwork_material(record, asset_root, index):
    material, shader = principled(f'Artwork / {index} / {record["colorHex"]}', record['colorLinear'], record['roughness'], record['metalness'])
    shader.inputs['IOR'].default_value = record['ior']
    shader.inputs['Coat Weight'].default_value = record['clearcoat']
    material['paint_hex'] = record['colorHex']
    material['finish'] = 'semi-gloss' if record['texture'] != 'plywood' else 'natural plywood'
    texture_id = record['texture']
    if texture_id is None:
        return material
    texture = image_node(material, asset_root / CONFIG['assets'][texture_id])
    nodes, links = material.node_tree.nodes, material.node_tree.links
    if texture_id == 'plywood':
        mix = nodes.new('ShaderNodeMixRGB'); mix.blend_type = 'MULTIPLY'
        mix.inputs[0].default_value = 1; mix.inputs[1].default_value = (*record['colorLinear'], 1)
        links.new(texture.outputs['Color'], mix.inputs[2]); links.new(mix.outputs[0], shader.inputs['Base Color'])
        return material
    luminance = nodes.new('ShaderNodeRGBToBW'); links.new(texture.outputs['Color'], luminance.inputs[0])
    tint = nodes.new('ShaderNodeMixRGB'); tint.inputs[0].default_value = S['grain_opacity']
    tint.inputs[1].default_value = (1, 1, 1, 1); links.new(luminance.outputs[0], tint.inputs[2])
    paint = nodes.new('ShaderNodeMixRGB'); paint.blend_type = 'MULTIPLY'; paint.inputs[0].default_value = 1
    paint.inputs[1].default_value = (*record['colorLinear'], 1)
    links.new(tint.outputs[0], paint.inputs[2]); links.new(paint.outputs[0], shader.inputs['Base Color'])
    bump = nodes.new('ShaderNodeBump'); bump.invert = record['bumpMeters'] < 0
    bump.inputs['Distance'].default_value = abs(record['bumpMeters'])
    bump.inputs['Strength'].default_value = S['grain_bump_strength']
    links.new(luminance.outputs[0], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], shader.inputs['Normal'])
    roughness = nodes.new('ShaderNodeMapRange')
    roughness.inputs['To Min'].default_value = record['roughness'] * S['grain_ridge_roughness']
    roughness.inputs['To Max'].default_value = record['roughness'] * S['grain_valley_roughness']
    links.new(luminance.outputs[0], roughness.inputs['Value']); links.new(roughness.outputs[0], shader.inputs['Roughness'])
    return material
