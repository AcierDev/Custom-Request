"""Validate data-only design files before Blender allocates any scene geometry."""
import json
import math
import re
from pathlib import Path

CONFIG_PATH = Path(__file__).with_name('config.json')
CONFIG = json.loads(CONFIG_PATH.read_text())
LIMITS = CONFIG['schema']
HEX_COLOR = re.compile(r'^#[0-9a-fA-F]{6}$')
MATRIX_SIDE = 4
XYZ = 3
SRGB = {'cutoff': 0.04045, 'linear_scale': 12.92, 'offset': 0.055, 'scale': 1.055, 'exponent': 2.4, 'byte_max': 255}


def numbers(values, count=None, limit=None):
    if not isinstance(values, list) or (count is not None and len(values) != count):
        raise ValueError('A design vector has the wrong length.')
    if not all(type(v) in (int, float) and math.isfinite(v) for v in values):
        raise ValueError('Design numbers must be finite.')
    if limit is not None and any(abs(v) > limit for v in values):
        raise ValueError('A design measurement exceeds the supported size.')


def color(value):
    if not isinstance(value, str) or not HEX_COLOR.fullmatch(value):
        raise ValueError('A paint color must be a six-digit hex color.')


def linear_hex(value):
    color(value)
    channels = [int(value[i:i + 2], 16) / SRGB['byte_max'] for i in (1, 3, 5)]
    return tuple(c / SRGB['linear_scale'] if c <= SRGB['cutoff'] else
                 ((c + SRGB['offset']) / SRGB['scale']) ** SRGB['exponent'] for c in channels)


def transform_point(matrix, point):
    """Three column-major affine meters -> Blender right-handed Z-up meters."""
    p = world_point(matrix, point)
    return p[0], -p[2], p[1]


def world_point(matrix, point):
    return [sum(matrix[column * MATRIX_SIDE + row] * point[column] for column in range(XYZ))
            + matrix[XYZ * MATRIX_SIDE + row] for row in range(XYZ)]


def validate_package(data):
    try:
        if not isinstance(data, dict) or data.get('schema') != LIMITS['name'] or data.get('schemaVersion') != LIMITS['version']:
            raise ValueError('Unsupported render file. Export a new Render file from the viewer.')
        if data['units'] != 'meters' or data['coordinateSystem'] != 'three-y-up' or data['colorSpace'] != 'linear-srgb':
            raise ValueError('Unsupported units, coordinate system or color space.')
        objects, geometries, materials = data['objects'], data['geometries'], data['materials']
        for sequence, maximum in [(objects, LIMITS['max_objects']), (geometries, LIMITS['max_geometries']), (materials, LIMITS['max_objects'])]:
            if not isinstance(sequence, list) or not sequence or len(sequence) > maximum:
                raise ValueError('Empty or oversized design geometry.')
        room = data['room']; color(room['wallColor'])
        if room['timeOfDay'] not in ('morning', 'afternoon', 'night') or type(room['lampOn']) is not bool:
            raise ValueError('Invalid room lighting settings.')
        for edge in ('min', 'max'): numbers(data['bounds'][edge], XYZ, LIMITS['max_coordinate'])
        if any(a > b for a, b in zip(data['bounds']['min'], data['bounds']['max'])):
            raise ValueError('Inverted artwork bounds.')
        total_vertices = 0
        for geometry in geometries:
            vertices = geometry['positions']; numbers(vertices, limit=LIMITS['max_coordinate'])
            if not vertices or len(vertices) % XYZ: raise ValueError('Incomplete vertex coordinates.')
            count = len(vertices) // XYZ; total_vertices += count
            if total_vertices > LIMITS['max_vertices']: raise ValueError('Too many design vertices.')
            numbers(geometry['normals'], len(vertices)); numbers(geometry['uvs'], count * LIMITS['uv_size'])
            for index in range(0, len(vertices), XYZ):
                length = sum(v * v for v in geometry['normals'][index:index + XYZ])
                if abs(length - 1) > LIMITS['epsilon']: raise ValueError('Artwork normals must have unit length.')
            faces = geometry['triangles']
            if not isinstance(faces, list) or not faces or len(faces) % LIMITS['triangle_size'] or not all(type(v) is int and 0 <= v < count for v in faces):
                raise ValueError('Invalid triangle vertex indices.')
        for material in materials:
            color(material['colorHex']); numbers(material['colorLinear'], XYZ)
            if any(abs(actual - expected) > LIMITS['epsilon'] for actual, expected in zip(material['colorLinear'], linear_hex(material['colorHex']))):
                raise ValueError('The paint color and linear color disagree. Export a new Render file.')
            for value in material['colorLinear'] + [material['roughness'], material['metalness'], material['clearcoat']]:
                numbers([value])
                if not 0 <= value <= 1: raise ValueError('Color and finish values must be between zero and one.')
            numbers([material['ior'], material['bumpMeters']])
            if not 1 <= material['ior'] <= XYZ: raise ValueError('Invalid paint index of refraction.')
            if material['texture'] not in ('grain', 'side', 'plywood', None): raise ValueError('Unknown local texture identifier.')
        names = set(); transformed_vertices = 0
        for obj in objects:
            if not isinstance(obj['name'], str) or not obj['name'] or obj['name'] in names: raise ValueError('Object names must be unique.')
            names.add(obj['name'])
            if obj['kind'] not in ('face', 'edge', 'backboard'): raise ValueError('Unknown artwork object type.')
            for reference, sequence in [('geometry', geometries), ('material', materials)]:
                if type(obj[reference]) is not int or not 0 <= obj[reference] < len(sequence): raise ValueError('Invalid geometry or material reference.')
            matrix = obj['matrix']; numbers(matrix, LIMITS['matrix_size'], LIMITS['max_coordinate'])
            if any(abs(matrix[i]) > LIMITS['epsilon'] for i in (3, 7, 11)) or abs(matrix[15] - 1) > LIMITS['epsilon']:
                raise ValueError('Artwork needs an affine matrix.')
            determinant = (matrix[0] * (matrix[5] * matrix[10] - matrix[9] * matrix[6])
                           - matrix[4] * (matrix[1] * matrix[10] - matrix[9] * matrix[2])
                           + matrix[8] * (matrix[1] * matrix[6] - matrix[5] * matrix[2]))
            if determinant <= LIMITS['epsilon'] ** XYZ: raise ValueError('Singular or mirrored artwork matrix.')
            vertices = geometries[obj['geometry']]['positions']
            transformed_vertices += len(vertices) // XYZ
            if transformed_vertices > LIMITS['max_transformed_vertices']:
                raise ValueError('Too many instanced artwork vertices.')
            for index in range(0, len(vertices), XYZ):
                point = world_point(matrix, vertices[index:index + XYZ])
                numbers(point, XYZ, LIMITS['max_coordinate'])
                if any(value < low - LIMITS['epsilon'] or value > high + LIMITS['epsilon']
                       for value, low, high in zip(point, data['bounds']['min'], data['bounds']['max'])):
                    raise ValueError('Artwork geometry lies outside its declared bounds.')
    except (KeyError, TypeError, IndexError) as error:
        raise ValueError(f'Incomplete or invalid render file: {error}') from error
    return data


def load_package(path):
    path = Path(path)
    if path.stat().st_size > LIMITS['max_file_bytes']: raise ValueError('Render file exceeds the supported file size.')
    try:
        return validate_package(json.loads(path.read_text(encoding='utf8')))
    except (UnicodeError, json.JSONDecodeError) as error:
        raise ValueError('This is not a valid JSON render file.') from error
