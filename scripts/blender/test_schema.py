import copy
import unittest
from schema import validate_package, transform_point, load_package
from pathlib import Path
from tempfile import TemporaryDirectory


def packet():
    return {"schema": "everwood-blender", "schemaVersion": 1, "units": "meters",
            "coordinateSystem": "three-y-up", "colorSpace": "linear-srgb",
            "room": {"wallColor": "#e6e2d9", "timeOfDay": "afternoon", "lampOn": True},
            "bounds": {"min": [0, 0, 0], "max": [1, 1, 0]}, "metadata": {},
            "geometries": [{"positions": [0, 0, 0, 1, 0, 0, 0, 1, 0],
                            "normals": [0, 0, 1] * 3, "uvs": [0, 0, 1, 0, 0, 1], "triangles": [0, 1, 2]}],
            "materials": [{"colorHex": "#ffffff", "colorLinear": [1, 1, 1], "roughness": 0.34,
                           "metalness": 0, "ior": 1.5, "clearcoat": 0, "texture": "grain", "bumpMeters": -0.00065}],
            "objects": [{"name": "tile", "kind": "face", "geometry": 0, "material": 0,
                         "matrix": [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]}]}


class SchemaTests(unittest.TestCase):
    def test_valid_packet_is_not_mutated(self):
        value = packet(); before = copy.deepcopy(value)
        validate_package(value)
        self.assertEqual(value, before)

    def test_unsupported_versions_and_empty_geometry_fail(self):
        for field, value in [("schemaVersion", 99), ("objects", []), ("units", "inches")]:
            data = packet(); data[field] = value
            with self.subTest(field=field), self.assertRaises(ValueError): validate_package(data)

    def test_non_finite_values_bad_indices_and_wrong_vectors_fail(self):
        for field, value in [("positions", [float('nan')] * 9), ("triangles", [0, 1, 5]), ("uvs", [0, 1]), ("normals", [0] * 9)]:
            data = packet(); data['geometries'][0][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError): validate_package(data)

    def test_bad_references_matrices_and_materials_fail(self):
        data = packet(); data['objects'][0]['geometry'] = 99
        with self.assertRaises(ValueError): validate_package(data)
        data = packet(); data['objects'][0]['matrix'][15] = 0
        with self.assertRaises(ValueError): validate_package(data)
        data = packet(); data['materials'][0]['colorLinear'][0] = -1
        with self.assertRaises(ValueError): validate_package(data)
        data = packet(); data['materials'][0]['texture'] = '/etc/passwd'
        with self.assertRaises(ValueError): validate_package(data)

    def test_color_space_mismatch_is_rejected_instead_of_silently_changing_the_paint(self):
        data = packet(); data['materials'][0]['colorHex'] = '#567778'
        with self.assertRaises(ValueError): validate_package(data)

    def test_transformed_vertices_cannot_bypass_measurement_limits(self):
        data = packet()
        data['geometries'][0]['positions'][3] = 1000
        data['objects'][0]['matrix'][0] = 1000
        with self.assertRaises(ValueError): validate_package(data)

    def test_declared_bounds_must_contain_the_transformed_artwork(self):
        data = packet(); data['objects'][0]['matrix'][12] = 10
        with self.assertRaises(ValueError): validate_package(data)

    def test_conservative_bounds_are_accepted_for_rotated_geometry(self):
        data = packet(); data['bounds'] = {'min': [-1, -1, -1], 'max': [2, 2, 1]}
        validate_package(data)

    def test_column_major_transform_and_axis_conversion_preserve_handedness(self):
        matrix = [0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 2, 3, 4, 1]
        self.assertEqual(transform_point(matrix, [1, 0, 0]), (2, -4, 4))

    def test_load_rejects_non_json_input(self):
        with TemporaryDirectory() as folder:
            path = Path(folder)/'design.json'; path.write_text('not json')
            with self.assertRaises(ValueError): load_package(path)


if __name__ == '__main__': unittest.main()
