import py_compile
import importlib
import importlib.util
import math
import unittest
from pathlib import Path
from types import SimpleNamespace

from fusion_bridge.bridge.config import PROTOCOL_VERSION
from fusion_bridge.jobs import ping, smoke_box


BRIDGE_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REQUEST_ID = "ping_request"
EXPECTED_WIDTH_MM = 40.0
EXPECTED_DEPTH_MM = 30.0
EXPECTED_HEIGHT_MM = 10.0
NON_POSITIVE_DIMENSION_MM = 0.0
EXPECTED_INSIDE_DIAMETER_MM = 15.9
EXPECTED_BAND_WIDTH_MM = 6.0
EXPECTED_RADIAL_THICKNESS_MM = 2.0
EXPECTED_EDGE_RADIUS_MM = 0.75
INVALID_EDGE_RADIUS_MM = 1.0
PLAIN_GOLD_APPEARANCE = "Gold"
POLISHED_GOLD_APPEARANCE = "Gold - Polished"
POLISHED_YELLOW_GOLD_APPEARANCE = "Gold - Polished Yellow"
WEDDING_BAND_MODULE = "fusion_bridge.jobs.wedding_band"
ENGAGEMENT_RING_MODULE = "fusion_bridge.jobs.engagement_ring"
GEM_MESH_MODULE = "fusion_bridge.jobs.gem_mesh"
EXPECTED_ENGAGEMENT_BAND_WIDTH_MM = 3.0
EXPECTED_CENTER_STONE_SIZE_MM = 6.5
EXPECTED_PRONG_DIAMETER_MM = 0.85
EXPECTED_HALO_STONE_DIAMETER_MM = 0.9
EXPECTED_SHOULDER_STONE_DIAMETER_MM = 2.3
EXPECTED_SHOULDER_STONE_COUNT = 10
EXPECTED_HALO_STONE_COUNT = 16
EXPECTED_PRONG_COUNT = 4
EXPECTED_HALO_SIDE_COUNT = 4
EXPECTED_HALO_WIRE_COUNT = 8
EXPECTED_HALO_POST_COUNT = 4
EXPECTED_HALO_SEPARATOR_COUNT = 12
EXPECTED_STONES_PER_SHOULDER = 5
EXPECTED_STONES_PER_HALO_SIDE = 4
EXPECTED_PRONG_PATH_POINT_COUNT = 4
EXPECTED_PRONG_PROFILE_COUNT = 4
EXPECTED_PRINCESS_PROFILE_COUNT = 6
EXPECTED_PRINCESS_PROFILE_POINT_COUNT = 8
EXPECTED_SHOULDER_BEAD_COUNT = 16
EXPECTED_SHOULDER_SEAT_COUNT = 10
EXPECTED_LAST_SHOULDER_ANGLE_DEGREES = 70.0
EXPECTED_CENTER_GIRDLE_HEIGHT_MM = 13.50
EXPECTED_HALO_HEIGHT_MM = 12.55
EXPECTED_HALO_RAIL_THICKNESS_MM = 0.3
AXIAL_CENTER_MM = 0.0
INVALID_DIMENSION_MM = 0.0
DIAMOND_APPEARANCE = "Diamond - Clear"
GLASS_APPEARANCE = "Glass - Clear"
PLAIN_DIAMOND_APPEARANCE = "Diamond"
CRYSTAL_APPEARANCE = "Gemstone - Crystal"
GEMSTONE_DIAMOND_APPEARANCE = "Gemstone - Diamond"
FROSTED_LIGHT_APPEARANCE = "Glass - Frosted Light"
CHROME_APPEARANCE = "Chrome"
BLACK_CHROME_APPEARANCE = "Chrome - Black"
EXPECTED_ENGAGEMENT_INNER_RADIUS_MM = 7.95
EXPECTED_ENGAGEMENT_OUTER_RADIUS_MM = 9.95
EXPECTED_SHOULDER_GIRDLE_RADIUS_MM = 9.65
MINIMUM_SHOULDER_STONE_CLEARANCE_MM = 0.0
MAXIMUM_SHOULDER_BEAD_PROTRUSION_MM = 0.10
EXPECTED_ENGAGEMENT_HALF_WIDTH_MM = 1.5
EXPECTED_ENGAGEMENT_OUTER_FLAT_LENGTH_MM = 1.10
EXPECTED_PRINCESS_VERTEX_COUNT = 170
EXPECTED_PRINCESS_TRIANGLE_COUNT = 336
EXPECTED_PRINCESS_HALF_SIZE_MM = 3.25
EXPECTED_PRINCESS_BOTTOM_MM = -2.35
EXPECTED_PRINCESS_TOP_MM = 1.55
EXPECTED_ROUND_VERTEX_COUNT = 57
EXPECTED_ROUND_TRIANGLE_COUNT = 110
EXPECTED_ROUND_RADIUS_MM = 1.15
EXPECTED_ROUND_BOTTOM_MM = -1.0212
EXPECTED_ROUND_TOP_MM = 0.391
EXPECTED_CAMERA_EXTENT_MM = 28.0
EXPECTED_CAMERA_EYE_HEIGHT_MM = 28.0
EXPECTED_CAMERA_UP_VECTOR = (0.0, 0.0, 1.0)
REFERENCE_TEST_TARGET_SIZE_MM = 10.0
REFERENCE_TEST_SOURCE_MINIMUM_CM = (-1.0, 1.0, -1.0)
REFERENCE_TEST_SOURCE_MAXIMUM_CM = (1.0, 3.0, 1.0)
REFERENCE_TEST_SCALE = 0.5


class GemMeshTests(unittest.TestCase):
    def setUp(self):
        spec = importlib.util.find_spec(GEM_MESH_MODULE)
        self.assertIsNotNone(spec, "gem_mesh module must exist")
        self.meshes = importlib.import_module(GEM_MESH_MODULE)

    def test_princess_mesh_is_closed_and_matches_6_5_mm_envelope(self):
        mesh = self.meshes.build_princess_mesh(6.5)

        self.assertEqual(len(mesh.vertices_mm), EXPECTED_PRINCESS_VERTEX_COUNT)
        self.assertEqual(len(mesh.triangles), EXPECTED_PRINCESS_TRIANGLE_COUNT)
        self.assertTrue(
            all(
                count == 2
                for count in self.meshes.edge_use_counts(mesh).values()
            )
        )
        minimum, maximum = mesh.bounds_mm()
        self.assertEqual(
            minimum,
            (
                -EXPECTED_PRINCESS_HALF_SIZE_MM,
                -EXPECTED_PRINCESS_HALF_SIZE_MM,
                EXPECTED_PRINCESS_BOTTOM_MM,
            ),
        )
        self.assertEqual(
            maximum,
            (
                EXPECTED_PRINCESS_HALF_SIZE_MM,
                EXPECTED_PRINCESS_HALF_SIZE_MM,
                EXPECTED_PRINCESS_TOP_MM,
            ),
        )

    def test_round_brilliant_mesh_is_closed_and_matches_2_3_mm_envelope(self):
        mesh = self.meshes.build_round_brilliant_mesh(2.3)

        self.assertEqual(len(mesh.vertices_mm), EXPECTED_ROUND_VERTEX_COUNT)
        self.assertEqual(len(mesh.triangles), EXPECTED_ROUND_TRIANGLE_COUNT)
        self.assertTrue(
            all(
                count == 2
                for count in self.meshes.edge_use_counts(mesh).values()
            )
        )
        minimum, maximum = mesh.bounds_mm()
        self.assertAlmostEqual(minimum[0], -EXPECTED_ROUND_RADIUS_MM)
        self.assertAlmostEqual(minimum[1], -EXPECTED_ROUND_RADIUS_MM)
        self.assertAlmostEqual(minimum[2], EXPECTED_ROUND_BOTTOM_MM)
        self.assertAlmostEqual(maximum[0], EXPECTED_ROUND_RADIUS_MM)
        self.assertAlmostEqual(maximum[1], EXPECTED_ROUND_RADIUS_MM)
        self.assertAlmostEqual(maximum[2], EXPECTED_ROUND_TOP_MM)


class PingJobTests(unittest.TestCase):
    def test_ping_reports_protocol_and_request(self):
        context = SimpleNamespace(
            request=SimpleNamespace(
                request_id=DEFAULT_REQUEST_ID,
                version=PROTOCOL_VERSION,
            )
        )

        result = ping.run(context)

        self.assertEqual(
            result,
            {
                "pong": True,
                "protocol_version": PROTOCOL_VERSION,
                "request_id": DEFAULT_REQUEST_ID,
            },
        )


class SmokeBoxJobTests(unittest.TestCase):
    def test_box_dimensions_use_named_defaults(self):
        dimensions = smoke_box.box_dimensions({})

        self.assertEqual(
            dimensions,
            {
                "width_mm": EXPECTED_WIDTH_MM,
                "depth_mm": EXPECTED_DEPTH_MM,
                "height_mm": EXPECTED_HEIGHT_MM,
            },
        )

    def test_box_dimensions_reject_non_positive_values(self):
        with self.assertRaises(ValueError):
            smoke_box.box_dimensions(
                {"width_mm": NON_POSITIVE_DIMENSION_MM}
            )


class WeddingBandJobTests(unittest.TestCase):
    def setUp(self):
        spec = importlib.util.find_spec(WEDDING_BAND_MODULE)
        self.assertIsNotNone(spec, "wedding_band job must exist")
        self.job = importlib.import_module(WEDDING_BAND_MODULE)

    def test_band_dimensions_use_size_5_25_defaults(self):
        dimensions = self.job.band_dimensions({})

        self.assertEqual(
            dimensions,
            {
                "inside_diameter_mm": EXPECTED_INSIDE_DIAMETER_MM,
                "band_width_mm": EXPECTED_BAND_WIDTH_MM,
                "radial_thickness_mm": EXPECTED_RADIAL_THICKNESS_MM,
                "edge_radius_mm": EXPECTED_EDGE_RADIUS_MM,
            },
        )

    def test_band_dimensions_reject_oversized_edge_radius(self):
        with self.assertRaises(ValueError):
            self.job.band_dimensions(
                {"edge_radius_mm": INVALID_EDGE_RADIUS_MM}
            )

    def test_yellow_polished_gold_is_preferred(self):
        selected = self.job.select_gold_appearance_name(
            [
                PLAIN_GOLD_APPEARANCE,
                POLISHED_GOLD_APPEARANCE,
                POLISHED_YELLOW_GOLD_APPEARANCE,
            ]
        )

        self.assertEqual(selected, POLISHED_YELLOW_GOLD_APPEARANCE)

    def test_rounded_profile_spans_requested_ring_envelope(self):
        self.assertTrue(
            hasattr(self.job, "rounded_profile_points"),
            "rounded_profile_points must exist",
        )
        points = self.job.rounded_profile_points(
            self.job.band_dimensions({})
        )
        radial_positions = [point[0] for point in points.values()]
        axial_positions = [point[1] for point in points.values()]

        self.assertEqual(min(radial_positions), 7.95)
        self.assertEqual(max(radial_positions), 9.95)
        self.assertEqual(min(axial_positions), -3.0)
        self.assertEqual(max(axial_positions), 3.0)


class EngagementRingJobTests(unittest.TestCase):
    def setUp(self):
        spec = importlib.util.find_spec(ENGAGEMENT_RING_MODULE)
        self.assertIsNotNone(spec, "engagement_ring job must exist")
        self.job = importlib.import_module(ENGAGEMENT_RING_MODULE)

    def test_parameters_match_approved_design(self):
        parameters = self.job.ring_parameters({})

        self.assertEqual(
            parameters["inside_diameter_mm"],
            EXPECTED_INSIDE_DIAMETER_MM,
        )
        self.assertEqual(
            parameters["band_width_mm"],
            EXPECTED_ENGAGEMENT_BAND_WIDTH_MM,
        )
        self.assertEqual(
            parameters["center_stone_size_mm"],
            EXPECTED_CENTER_STONE_SIZE_MM,
        )
        self.assertEqual(
            parameters["prong_diameter_mm"],
            EXPECTED_PRONG_DIAMETER_MM,
        )
        self.assertEqual(
            parameters["halo_stone_diameter_mm"],
            EXPECTED_HALO_STONE_DIAMETER_MM,
        )
        self.assertEqual(
            parameters["shoulder_stone_diameter_mm"],
            EXPECTED_SHOULDER_STONE_DIAMETER_MM,
        )

    def test_parameters_reject_non_positive_dimensions(self):
        with self.assertRaises(ValueError):
            self.job.ring_parameters(
                {"center_stone_size_mm": INVALID_DIMENSION_MM}
            )

    def test_fusion_mesh_arrays_flatten_and_scale_geometry(self):
        mesh = SimpleNamespace(
            vertices_mm=(
                (1.0, 2.0, 3.0),
                (-4.0, 5.0, -6.0),
                (7.0, -8.0, 9.0),
            ),
            triangles=((0, 1, 2),),
        )

        coordinates, indices = self.job.fusion_mesh_arrays(mesh, 0.1)

        self.assertEqual(
            coordinates,
            [0.1, 0.2, 0.3, -0.4, 0.5, -0.6, 0.7, -0.8, 0.9],
        )
        self.assertEqual(indices, [0, 1, 2])

    def test_reference_princess_transform_scales_centers_and_rotates_brep(self):
        spec = self.job.reference_princess_transform_spec(
            REFERENCE_TEST_SOURCE_MINIMUM_CM,
            REFERENCE_TEST_SOURCE_MAXIMUM_CM,
            REFERENCE_TEST_TARGET_SIZE_MM,
        )

        self.assertEqual(spec["scale"], REFERENCE_TEST_SCALE)
        self.assertEqual(
            spec["matrix_rows"],
            (
                (0.5, 0.0, 0.0, 0.0),
                (0.0, 0.0, -0.5, 0.0),
                (0.0, 0.5, 0.0, -1.0),
                (0.0, 0.0, 0.0, 1.0),
            ),
        )

    def test_reference_princess_document_is_selected_by_exact_name(self):
        target_document = SimpleNamespace(name="Untitled")
        unrelated_document = SimpleNamespace(name="Princess Ring")
        reference_document = SimpleNamespace(name="Princess Cut Diamond")

        selected = self.job.select_reference_princess_document(
            [target_document, unrelated_document, reference_document],
            target_document,
        )

        self.assertIs(selected, reference_document)

    def test_presentation_camera_is_a_close_upright_side_three_quarter_view(self):
        camera = self.job.presentation_camera_spec(
            self.job.ring_parameters({})
        )

        self.assertEqual(camera["extent_mm"], EXPECTED_CAMERA_EXTENT_MM)
        self.assertEqual(camera["up"], EXPECTED_CAMERA_UP_VECTOR)
        self.assertLess(camera["eye_mm"][1], AXIAL_CENTER_MM)
        self.assertEqual(camera["eye_mm"][0], AXIAL_CENTER_MM)
        self.assertEqual(
            camera["eye_mm"][2],
            EXPECTED_CAMERA_EYE_HEIGHT_MM,
        )
        self.assertGreater(camera["eye_mm"][2], camera["target_mm"][2])

    def test_crystal_appearance_is_preferred_for_clean_shaded_stones(self):
        selected = self.job.select_appearance_name(
            [DIAMOND_APPEARANCE, CRYSTAL_APPEARANCE],
            self.job.STONE_APPEARANCE_TOKENS,
        )

        self.assertEqual(selected, CRYSTAL_APPEARANCE)

    def test_real_diamond_is_preferred_for_small_accent_stones(self):
        selected = self.job.select_appearance_name(
            [
                CHROME_APPEARANCE,
                CRYSTAL_APPEARANCE,
                GEMSTONE_DIAMOND_APPEARANCE,
            ],
            self.job.ACCENT_STONE_APPEARANCE_TOKENS,
        )

        self.assertEqual(selected, GEMSTONE_DIAMOND_APPEARANCE)

    def test_appearance_selection_prefers_all_requested_tokens(self):
        selected = self.job.select_appearance_name(
            [GLASS_APPEARANCE, DIAMOND_APPEARANCE],
            ("diamond", "clear"),
        )

        self.assertEqual(selected, DIAMOND_APPEARANCE)

    def test_equal_appearance_matches_prefer_cleaner_shorter_name(self):
        selected = self.job.select_appearance_name(
            [BLACK_CHROME_APPEARANCE, CHROME_APPEARANCE],
            ("chrome",),
        )

        self.assertEqual(selected, CHROME_APPEARANCE)

    def test_diamond_material_beats_clear_glass_fallback(self):
        selected = self.job.select_appearance_name(
            [GLASS_APPEARANCE, PLAIN_DIAMOND_APPEARANCE],
            ("diamond", "clear", "glass", "gem"),
        )

        self.assertEqual(selected, PLAIN_DIAMOND_APPEARANCE)

    def test_shoulder_stones_form_one_centered_row_per_side(self):
        placements = self.job.shoulder_stone_placements(
            self.job.ring_parameters({})
        )

        self.assertEqual(
            len(placements),
            EXPECTED_SHOULDER_STONE_COUNT,
        )
        self.assertEqual(
            sum(item["side"] == "left" for item in placements),
            EXPECTED_STONES_PER_SHOULDER,
        )
        self.assertEqual(
            sum(item["side"] == "right" for item in placements),
            EXPECTED_STONES_PER_SHOULDER,
        )
        self.assertTrue(
            all(
                item["center_mm"][1] == AXIAL_CENTER_MM
                for item in placements
            )
        )

    def test_shoulder_stone_girdles_are_recessed_into_the_shank(self):
        placements = self.job.shoulder_stone_placements(
            self.job.ring_parameters({})
        )

        girdle_radii_mm = [
            math.hypot(item["center_mm"][0], item["center_mm"][2])
            for item in placements
        ]
        self.assertTrue(
            all(
                math.isclose(radius_mm, EXPECTED_SHOULDER_GIRDLE_RADIUS_MM)
                for radius_mm in girdle_radii_mm
            )
        )
        self.assertTrue(
            all(
                radius_mm < EXPECTED_ENGAGEMENT_OUTER_RADIUS_MM
                for radius_mm in girdle_radii_mm
            )
        )

    def test_adjacent_shoulder_stones_do_not_overlap(self):
        parameters = self.job.ring_parameters({})
        placements = self.job.shoulder_stone_placements(parameters)

        for side_name in ("left", "right"):
            centers = [
                item["center_mm"]
                for item in placements
                if item["side"] == side_name
            ]
            for first, second in zip(centers, centers[1:]):
                center_distance_mm = math.dist(first, second)
                clearance_mm = (
                    center_distance_mm
                    - parameters["shoulder_stone_diameter_mm"]
                )
                self.assertGreaterEqual(
                    clearance_mm,
                    MINIMUM_SHOULDER_STONE_CLEARANCE_MM,
                )

    def test_shoulder_seats_follow_stones_and_leave_lower_shank_plain(self):
        seats = self.job.shoulder_seat_specs(
            self.job.ring_parameters({})
        )

        self.assertEqual(len(seats), EXPECTED_SHOULDER_SEAT_COUNT)
        self.assertEqual(
            max(seat["angle_degrees"] for seat in seats),
            EXPECTED_LAST_SHOULDER_ANGLE_DEGREES,
        )
        self.assertTrue(
            all(seat["outer_radius_mm"] > seat["inner_radius_mm"] for seat in seats)
        )
        self.assertTrue(
            all(seat["start_mm"] != seat["end_mm"] for seat in seats)
        )

    def test_band_profile_spans_approved_envelope(self):
        points = self.job.band_profile_points(
            self.job.ring_parameters({})
        )
        radial_positions = [point[0] for point in points.values()]
        axial_positions = [point[1] for point in points.values()]

        self.assertEqual(
            min(radial_positions),
            EXPECTED_ENGAGEMENT_INNER_RADIUS_MM,
        )
        self.assertEqual(
            max(radial_positions),
            EXPECTED_ENGAGEMENT_OUTER_RADIUS_MM,
        )
        self.assertEqual(
            min(axial_positions),
            -EXPECTED_ENGAGEMENT_HALF_WIDTH_MM,
        )
        self.assertEqual(
            max(axial_positions),
            EXPECTED_ENGAGEMENT_HALF_WIDTH_MM,
        )

    def test_band_profile_has_a_softly_domed_outer_shank(self):
        points = self.job.band_profile_points(
            self.job.ring_parameters({})
        )

        outer_flat_length_mm = (
            points["right_top"][1] - points["right_bottom"][1]
        )
        self.assertAlmostEqual(
            outer_flat_length_mm,
            EXPECTED_ENGAGEMENT_OUTER_FLAT_LENGTH_MM,
        )

    def test_hidden_halo_has_four_stones_on_each_side(self):
        placements = self.job.halo_stone_placements(
            self.job.ring_parameters({})
        )

        self.assertEqual(len(placements), EXPECTED_HALO_STONE_COUNT)
        for side in ("front", "back", "left", "right"):
            self.assertEqual(
                sum(item["side"] == side for item in placements),
                EXPECTED_STONES_PER_HALO_SIDE,
            )

    def test_center_setting_is_lower_and_delicate(self):
        parameters = self.job.ring_parameters({})

        self.assertEqual(
            parameters["center_girdle_height_mm"],
            EXPECTED_CENTER_GIRDLE_HEIGHT_MM,
        )
        self.assertEqual(
            parameters["halo_height_mm"],
            EXPECTED_HALO_HEIGHT_MM,
        )
        self.assertEqual(
            parameters["halo_rail_thickness_mm"],
            EXPECTED_HALO_RAIL_THICKNESS_MM,
        )

    def test_hidden_halo_gallery_is_two_delicate_square_wires_with_posts(self):
        parameters = self.job.ring_parameters({})
        segments = self.job.halo_gallery_segments(parameters)
        separators = self.job.halo_separator_centers(parameters)

        self.assertEqual(
            sum(segment["kind"] == "wire" for segment in segments),
            EXPECTED_HALO_WIRE_COUNT,
        )
        self.assertEqual(
            sum(segment["kind"] == "post" for segment in segments),
            EXPECTED_HALO_POST_COUNT,
        )
        self.assertEqual(len(separators), EXPECTED_HALO_SEPARATOR_COUNT)
        gallery_top_mm = max(
            max(segment["start_mm"][2], segment["end_mm"][2])
            + segment["diameter_mm"] / 2
            for segment in segments
        )
        center_lower_girdle_mm = (
            parameters["center_girdle_height_mm"]
            - parameters["center_girdle_thickness_mm"] / 2
        )
        self.assertLess(gallery_top_mm, center_lower_girdle_mm)

    def test_princess_cut_has_six_chamfered_faceted_profiles(self):
        profiles = self.job.princess_profile_specs(
            self.job.ring_parameters({})
        )

        self.assertEqual(len(profiles), EXPECTED_PRINCESS_PROFILE_COUNT)
        self.assertTrue(
            all(
                len(profile["points_mm"])
                == EXPECTED_PRINCESS_PROFILE_POINT_COUNT
                for profile in profiles
            )
        )
        heights = [profile["height_mm"] for profile in profiles]
        self.assertEqual(heights, sorted(heights))
        self.assertLess(
            max(abs(value) for point in profiles[-1]["points_mm"] for value in point),
            max(abs(value) for point in profiles[2]["points_mm"] for value in point),
        )

    def test_setting_has_four_smooth_four_point_prong_paths(self):
        paths = self.job.prong_paths(self.job.ring_parameters({}))

        self.assertEqual(len(paths), EXPECTED_PRONG_COUNT)
        self.assertTrue(
            all(
                len(path) == EXPECTED_PRONG_PATH_POINT_COUNT
                for path in paths
            )
        )
        self.assertTrue(
            all(
                path[0][2] < path[1][2] < path[2][2] < path[3][2]
                for path in paths
            )
        )

    def test_prong_profiles_taper_smoothly_from_low_roots_to_tips(self):
        profiles = self.job.prong_profile_specs(
            self.job.ring_parameters({})
        )

        self.assertEqual(len(profiles), EXPECTED_PRONG_COUNT)
        self.assertTrue(
            all(len(prong) == EXPECTED_PRONG_PROFILE_COUNT for prong in profiles)
        )
        for prong in profiles:
            diameters = [profile["diameter_mm"] for profile in prong]
            heights = [profile["point_mm"][2] for profile in prong]
            self.assertTrue(
                all(
                    first > second
                    for first, second in zip(diameters, diameters[1:])
                )
            )
            self.assertEqual(heights, sorted(heights))
            self.assertTrue(
                all(profile["plane_kind"] == "offset_xy" for profile in prong)
            )

    def test_shoulder_stones_have_paired_gold_beads_between_them(self):
        centers = self.job.shoulder_bead_centers(
            self.job.ring_parameters({})
        )

        self.assertEqual(len(centers), EXPECTED_SHOULDER_BEAD_COUNT)
        self.assertEqual(
            sum(center[1] < AXIAL_CENTER_MM for center in centers),
            EXPECTED_SHOULDER_BEAD_COUNT // 2,
        )
        self.assertEqual(
            sum(center[1] > AXIAL_CENTER_MM for center in centers),
            EXPECTED_SHOULDER_BEAD_COUNT // 2,
        )

    def test_shoulder_beads_are_delicate_and_recessed(self):
        parameters = self.job.ring_parameters({})
        centers = self.job.shoulder_bead_centers(parameters)
        bead_radius_mm = parameters["shoulder_bead_diameter_mm"] / 2

        outermost_radii_mm = [
            math.hypot(center[0], center[2]) + bead_radius_mm
            for center in centers
        ]
        self.assertTrue(
            all(
                radius_mm
                <= EXPECTED_ENGAGEMENT_OUTER_RADIUS_MM
                + MAXIMUM_SHOULDER_BEAD_PROTRUSION_MM
                for radius_mm in outermost_radii_mm
            )
        )

    def test_temporary_prongs_are_persisted_through_an_edited_base_feature(self):
        events = []

        class FakeBody:
            name = ""

        class FakeBodies:
            def add(self, temporary_body, base_feature):
                events.append(("add", temporary_body, base_feature))
                return FakeBody()

        class FakeBaseFeature:
            def startEdit(self):
                events.append(("start",))

            def finishEdit(self):
                events.append(("finish",))

        base_feature = FakeBaseFeature()

        class FakeBaseFeatures:
            def add(self):
                events.append(("create",))
                return base_feature

        root_component = SimpleNamespace(
            features=SimpleNamespace(
                baseFeatures=FakeBaseFeatures(),
            ),
            bRepBodies=FakeBodies(),
        )
        temporary_body = object()

        bodies = self.job.persist_temporary_bodies(
            root_component,
            [temporary_body],
            ["Prong 1"],
        )

        self.assertEqual(len(bodies), 1)
        self.assertEqual(bodies[0].name, "Prong 1")
        self.assertEqual(
            events,
            [
                ("create",),
                ("start",),
                ("add", temporary_body, base_feature),
                ("finish",),
            ],
        )

    def test_persisted_bodies_return_base_feature_results_not_lost_sources(self):
        source_body = SimpleNamespace(name="")
        result_body = SimpleNamespace(name="")

        class FakeDocumentBodies:
            def add(self, temporary_body, base_feature):
                del temporary_body, base_feature
                return source_body

        class FakeResultBodies:
            def item(self, index):
                self.last_index = index
                return result_body

        class FakeBaseFeature:
            def __init__(self):
                self.bodies = FakeResultBodies()

            def startEdit(self):
                return None

            def finishEdit(self):
                return None

        base_feature = FakeBaseFeature()
        root_component = SimpleNamespace(
            features=SimpleNamespace(
                baseFeatures=SimpleNamespace(add=lambda: base_feature),
            ),
            bRepBodies=FakeDocumentBodies(),
        )

        bodies = self.job.persist_temporary_bodies(
            root_component,
            [object()],
            ["Seat Cutter"],
        )

        self.assertIs(bodies[0], result_body)
        self.assertEqual(result_body.name, "Seat Cutter")

    def test_linked_occurrences_are_added_without_renaming(self):
        class ReadOnlyOccurrence:
            @property
            def name(self):
                return "Shared Diamond:1"

            @name.setter
            def name(self, value):
                raise AssertionError("Fusion occurrence names are read-only")

        class FakeOccurrences:
            def __init__(self):
                self.transforms = []

            def addExistingComponent(self, component, transform):
                self.transforms.append((component, transform))
                return ReadOnlyOccurrence()

        collection = FakeOccurrences()
        component = object()
        transforms = [object(), object()]

        occurrences = self.job.add_existing_occurrences(
            collection,
            component,
            transforms,
        )

        self.assertEqual(len(occurrences), len(transforms))
        self.assertEqual(
            collection.transforms,
            [(component, transform) for transform in transforms],
        )

    def test_master_occurrence_is_created_at_first_stone_transform(self):
        class FakeOccurrences:
            def __init__(self):
                self.events = []

            def addNewComponent(self, transform):
                component = object()
                master = SimpleNamespace(component=component)
                self.events.append(("new", transform, component))
                return master

            def addExistingComponent(self, component, transform):
                self.events.append(("existing", transform, component))
                return (component, transform)

        collection = FakeOccurrences()
        transforms = [object(), object(), object()]
        built_bodies = []

        def build_body(component):
            body = object()
            built_bodies.append((component, body))
            return body

        master, component, body, occurrences = (
            self.job.create_component_occurrences(
            collection,
            transforms,
            build_body,
            )
        )

        self.assertIs(collection.events[0][1], transforms[0])
        self.assertEqual(built_bodies, [(component, body)])
        self.assertEqual(len(occurrences), len(transforms))
        self.assertIs(occurrences[0], master)
        self.assertEqual(
            [event[1] for event in collection.events[1:]],
            transforms[1:],
        )

    def test_prong_segment_endpoints_overlap_their_joint(self):
        start, end = self.job.expanded_segment_endpoints(
            (0.0, 0.0, 0.0),
            (1.0, 0.0, 0.0),
            0.1,
        )

        self.assertEqual(start, (-0.1, 0.0, 0.0))
        self.assertEqual(end, (1.1, 0.0, 0.0))


class SyntaxTests(unittest.TestCase):
    def test_all_bridge_python_files_compile(self):
        for path in BRIDGE_ROOT.rglob("*.py"):
            py_compile.compile(str(path), doraise=True)


if __name__ == "__main__":
    unittest.main()
