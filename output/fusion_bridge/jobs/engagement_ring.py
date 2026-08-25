import math

try:
    from fusion_bridge.jobs import gem_mesh
except ImportError:
    from jobs import gem_mesh


DEFAULT_INSIDE_DIAMETER_MM = 15.9
DEFAULT_BAND_WIDTH_MM = 3.0
DEFAULT_RADIAL_THICKNESS_MM = 2.0
DEFAULT_EDGE_RADIUS_MM = 0.95
DEFAULT_CENTER_STONE_SIZE_MM = 6.5
DEFAULT_CENTER_TABLE_RATIO = 0.58
DEFAULT_CENTER_GIRDLE_HEIGHT_MM = 13.50
DEFAULT_CENTER_TABLE_HEIGHT_MM = 15.05
DEFAULT_CENTER_CULET_HEIGHT_MM = 11.15
DEFAULT_CENTER_CULET_SIZE_MM = 0.18
DEFAULT_CENTER_PAVILION_BREAK_HEIGHT_MM = 12.32
DEFAULT_CENTER_PAVILION_BREAK_RATIO = 0.78
DEFAULT_CENTER_GIRDLE_THICKNESS_MM = 0.24
DEFAULT_CENTER_CROWN_BREAK_HEIGHT_MM = 14.55
DEFAULT_CENTER_CROWN_BREAK_RATIO = 0.80
DEFAULT_CULET_CHAMFER_RATIO = 0.15
DEFAULT_PAVILION_CHAMFER_RATIO = 0.11
DEFAULT_GIRDLE_CHAMFER_RATIO = 0.035
DEFAULT_CROWN_CHAMFER_RATIO = 0.08
DEFAULT_TABLE_CHAMFER_RATIO = 0.06
DEFAULT_PRONG_DIAMETER_MM = 0.85
DEFAULT_PRONG_TIP_DIAMETER_MM = 0.82
DEFAULT_PRONG_ROOT_PROFILE_DIAMETER_MM = 1.00
DEFAULT_PRONG_MID_PROFILE_DIAMETER_MM = 0.90
DEFAULT_PRONG_UPPER_PROFILE_DIAMETER_MM = 0.78
DEFAULT_PRONG_TIP_PROFILE_DIAMETER_MM = 0.68
DEFAULT_HALO_STONE_DIAMETER_MM = 0.9
DEFAULT_SHOULDER_STONE_DIAMETER_MM = 2.3
DEFAULT_HALO_HALF_SPAN_MM = 3.0
DEFAULT_HALO_HEIGHT_MM = 12.55
DEFAULT_HALO_RAIL_THICKNESS_MM = 0.3
DEFAULT_HALO_RAIL_HEIGHT_MM = 0.3
DEFAULT_HALO_LOWER_WIRE_HEIGHT_MM = 12.05
DEFAULT_HALO_UPPER_WIRE_HEIGHT_MM = 13.05
DEFAULT_HALO_WIRE_DIAMETER_MM = 0.24
DEFAULT_HALO_POST_DIAMETER_MM = 0.20
DEFAULT_HALO_SEPARATOR_DIAMETER_MM = 0.28
DEFAULT_SHOULDER_GIRDLE_INSET_MM = 0.30
DEFAULT_SHOULDER_BEAD_DIAMETER_MM = 0.26
DEFAULT_SHOULDER_BEAD_AXIAL_OFFSET_MM = 0.96
DEFAULT_SHOULDER_BEAD_RADIAL_INSET_MM = 0.07
DEFAULT_SHOULDER_SEAT_INNER_DIAMETER_MM = 1.35
DEFAULT_SHOULDER_SEAT_OUTER_DIAMETER_MM = 1.90
DEFAULT_SHOULDER_SEAT_INSET_DEPTH_MM = 0.80
DEFAULT_SHOULDER_SEAT_OUTWARD_LENGTH_MM = 0.35
DEFAULT_PRONG_ROOT_TANGENTIAL_MM = 2.30
DEFAULT_PRONG_ROOT_AXIAL_MM = 1.05
DEFAULT_PRONG_ROOT_HEIGHT_MM = 9.35
DEFAULT_PRONG_MID_TANGENTIAL_MM = 2.85
DEFAULT_PRONG_MID_AXIAL_MM = 2.00
DEFAULT_PRONG_MID_HEIGHT_MM = 10.85
DEFAULT_PRONG_UPPER_TANGENTIAL_MM = 3.25
DEFAULT_PRONG_UPPER_AXIAL_MM = 2.85
DEFAULT_PRONG_UPPER_HEIGHT_MM = 12.55
DEFAULT_PRONG_TIP_TANGENTIAL_MM = 3.10
DEFAULT_PRONG_TIP_AXIAL_MM = 3.10
DEFAULT_PRONG_TIP_HEIGHT_MM = 14.35
MESH_COORDINATE_DECIMAL_PLACES = 12
PRESENTATION_CAMERA_EYE_MM = (0.0, -40.0, 28.0)
PRESENTATION_CAMERA_TARGET_MM = (0.0, 0.0, 4.5)
PRESENTATION_CAMERA_UP_VECTOR = (0.0, 0.0, 1.0)
PRESENTATION_CAMERA_EXTENT_MM = 28.0
SHOULDER_ANGLE_OFFSETS_DEGREES = (14.0, 28.0, 42.0, 56.0, 70.0)
HALO_STONE_OFFSETS_MM = (-2.1, -0.7, 0.7, 2.1)
SIDE_SIGNS = (-1.0, 1.0)
HALF_DIVISOR = 2.0
AXIAL_CENTER_MM = 0.0
MIN_EXCLUSIVE_DIMENSION_MM = 0.0
TOKEN_PRIORITY_MULTIPLIER = 10
DIAGONAL_FACTOR = math.sqrt(0.5)
MILLIMETERS_TO_CENTIMETERS = 0.1
REFERENCE_PRINCESS_DOCUMENT_NAME = "Princess Cut Diamond"
REFERENCE_PRINCESS_SOURCE_LABEL = "Everwood/Princess Cut Diamond"


def select_appearance_name(names, preferred_tokens):
    candidates = []
    for name in names:
        normalized = name.casefold()
        score = sum(
            TOKEN_PRIORITY_MULTIPLIER
            ** (len(preferred_tokens) - token_index)
            for token_index, token in enumerate(preferred_tokens)
            if token.casefold() in normalized
        )
        candidates.append((score, -len(normalized), normalized, name))
    if not candidates:
        return None
    return max(candidates)[3]


def reference_princess_transform_spec(
    minimum_cm,
    maximum_cm,
    target_size_mm,
):
    source_center_cm = tuple(
        (minimum + maximum) / HALF_DIVISOR
        for minimum, maximum in zip(minimum_cm, maximum_cm)
    )
    source_square_size_cm = max(
        maximum_cm[0] - minimum_cm[0],
        maximum_cm[2] - minimum_cm[2],
    )
    if source_square_size_cm <= MIN_EXCLUSIVE_DIMENSION_MM:
        raise ValueError("reference princess bounds must have positive size")
    target_size_cm = target_size_mm * MILLIMETERS_TO_CENTIMETERS
    scale = target_size_cm / source_square_size_cm
    center_x_cm, center_depth_cm, center_y_cm = source_center_cm
    return {
        "scale": scale,
        "matrix_rows": (
            (scale, 0.0, 0.0, -scale * center_x_cm),
            (0.0, 0.0, -scale, scale * center_y_cm),
            (0.0, scale, 0.0, -scale * center_depth_cm),
            (0.0, 0.0, 0.0, 1.0),
        ),
    }


def select_reference_princess_document(documents, target_document):
    expected_name = REFERENCE_PRINCESS_DOCUMENT_NAME.casefold()
    for document in documents:
        if document is target_document:
            continue
        if document.name.casefold() == expected_name:
            return document
    raise RuntimeError(
        "open the Everwood Princess Cut Diamond design before building the ring"
    )


def band_profile_points(parameters):
    inner_radius = parameters["inside_diameter_mm"] / HALF_DIVISOR
    outer_radius = inner_radius + parameters["radial_thickness_mm"]
    half_width = parameters["band_width_mm"] / HALF_DIVISOR
    radius = parameters["edge_radius_mm"]
    diagonal = radius * DIAGONAL_FACTOR
    top = half_width
    bottom = -half_width
    return {
        "top_left": (inner_radius + radius, top),
        "top_right": (outer_radius - radius, top),
        "top_right_mid": (
            outer_radius - radius + diagonal,
            top - radius + diagonal,
        ),
        "right_top": (outer_radius, top - radius),
        "right_bottom": (outer_radius, bottom + radius),
        "bottom_right_mid": (
            outer_radius - radius + diagonal,
            bottom + radius - diagonal,
        ),
        "bottom_right": (outer_radius - radius, bottom),
        "bottom_left": (inner_radius + radius, bottom),
        "bottom_left_mid": (
            inner_radius + radius - diagonal,
            bottom + radius - diagonal,
        ),
        "left_bottom": (inner_radius, bottom + radius),
        "left_top": (inner_radius, top - radius),
        "top_left_mid": (
            inner_radius + radius - diagonal,
            top - radius + diagonal,
        ),
    }


def ring_parameters(overrides):
    defaults = {
        "inside_diameter_mm": DEFAULT_INSIDE_DIAMETER_MM,
        "band_width_mm": DEFAULT_BAND_WIDTH_MM,
        "radial_thickness_mm": DEFAULT_RADIAL_THICKNESS_MM,
        "edge_radius_mm": DEFAULT_EDGE_RADIUS_MM,
        "center_stone_size_mm": DEFAULT_CENTER_STONE_SIZE_MM,
        "center_table_ratio": DEFAULT_CENTER_TABLE_RATIO,
        "center_girdle_height_mm": DEFAULT_CENTER_GIRDLE_HEIGHT_MM,
        "center_table_height_mm": DEFAULT_CENTER_TABLE_HEIGHT_MM,
        "center_culet_height_mm": DEFAULT_CENTER_CULET_HEIGHT_MM,
        "center_culet_size_mm": DEFAULT_CENTER_CULET_SIZE_MM,
        "center_pavilion_break_height_mm": (
            DEFAULT_CENTER_PAVILION_BREAK_HEIGHT_MM
        ),
        "center_pavilion_break_ratio": DEFAULT_CENTER_PAVILION_BREAK_RATIO,
        "center_girdle_thickness_mm": DEFAULT_CENTER_GIRDLE_THICKNESS_MM,
        "center_crown_break_height_mm": DEFAULT_CENTER_CROWN_BREAK_HEIGHT_MM,
        "center_crown_break_ratio": DEFAULT_CENTER_CROWN_BREAK_RATIO,
        "culet_chamfer_ratio": DEFAULT_CULET_CHAMFER_RATIO,
        "pavilion_chamfer_ratio": DEFAULT_PAVILION_CHAMFER_RATIO,
        "girdle_chamfer_ratio": DEFAULT_GIRDLE_CHAMFER_RATIO,
        "crown_chamfer_ratio": DEFAULT_CROWN_CHAMFER_RATIO,
        "table_chamfer_ratio": DEFAULT_TABLE_CHAMFER_RATIO,
        "prong_diameter_mm": DEFAULT_PRONG_DIAMETER_MM,
        "prong_tip_diameter_mm": DEFAULT_PRONG_TIP_DIAMETER_MM,
        "prong_root_profile_diameter_mm": (
            DEFAULT_PRONG_ROOT_PROFILE_DIAMETER_MM
        ),
        "prong_mid_profile_diameter_mm": (
            DEFAULT_PRONG_MID_PROFILE_DIAMETER_MM
        ),
        "prong_upper_profile_diameter_mm": (
            DEFAULT_PRONG_UPPER_PROFILE_DIAMETER_MM
        ),
        "prong_tip_profile_diameter_mm": (
            DEFAULT_PRONG_TIP_PROFILE_DIAMETER_MM
        ),
        "halo_stone_diameter_mm": DEFAULT_HALO_STONE_DIAMETER_MM,
        "shoulder_stone_diameter_mm": DEFAULT_SHOULDER_STONE_DIAMETER_MM,
        "halo_half_span_mm": DEFAULT_HALO_HALF_SPAN_MM,
        "halo_height_mm": DEFAULT_HALO_HEIGHT_MM,
        "halo_rail_thickness_mm": DEFAULT_HALO_RAIL_THICKNESS_MM,
        "halo_rail_height_mm": DEFAULT_HALO_RAIL_HEIGHT_MM,
        "halo_lower_wire_height_mm": DEFAULT_HALO_LOWER_WIRE_HEIGHT_MM,
        "halo_upper_wire_height_mm": DEFAULT_HALO_UPPER_WIRE_HEIGHT_MM,
        "halo_wire_diameter_mm": DEFAULT_HALO_WIRE_DIAMETER_MM,
        "halo_post_diameter_mm": DEFAULT_HALO_POST_DIAMETER_MM,
        "halo_separator_diameter_mm": DEFAULT_HALO_SEPARATOR_DIAMETER_MM,
        "shoulder_girdle_inset_mm": DEFAULT_SHOULDER_GIRDLE_INSET_MM,
        "shoulder_bead_diameter_mm": DEFAULT_SHOULDER_BEAD_DIAMETER_MM,
        "shoulder_bead_axial_offset_mm": (
            DEFAULT_SHOULDER_BEAD_AXIAL_OFFSET_MM
        ),
        "shoulder_bead_radial_inset_mm": (
            DEFAULT_SHOULDER_BEAD_RADIAL_INSET_MM
        ),
        "shoulder_seat_inner_diameter_mm": (
            DEFAULT_SHOULDER_SEAT_INNER_DIAMETER_MM
        ),
        "shoulder_seat_outer_diameter_mm": (
            DEFAULT_SHOULDER_SEAT_OUTER_DIAMETER_MM
        ),
        "shoulder_seat_inset_depth_mm": DEFAULT_SHOULDER_SEAT_INSET_DEPTH_MM,
        "shoulder_seat_outward_length_mm": (
            DEFAULT_SHOULDER_SEAT_OUTWARD_LENGTH_MM
        ),
        "prong_root_tangential_mm": DEFAULT_PRONG_ROOT_TANGENTIAL_MM,
        "prong_root_axial_mm": DEFAULT_PRONG_ROOT_AXIAL_MM,
        "prong_root_height_mm": DEFAULT_PRONG_ROOT_HEIGHT_MM,
        "prong_mid_tangential_mm": DEFAULT_PRONG_MID_TANGENTIAL_MM,
        "prong_mid_axial_mm": DEFAULT_PRONG_MID_AXIAL_MM,
        "prong_mid_height_mm": DEFAULT_PRONG_MID_HEIGHT_MM,
        "prong_upper_tangential_mm": DEFAULT_PRONG_UPPER_TANGENTIAL_MM,
        "prong_upper_axial_mm": DEFAULT_PRONG_UPPER_AXIAL_MM,
        "prong_upper_height_mm": DEFAULT_PRONG_UPPER_HEIGHT_MM,
        "prong_tip_tangential_mm": DEFAULT_PRONG_TIP_TANGENTIAL_MM,
        "prong_tip_axial_mm": DEFAULT_PRONG_TIP_AXIAL_MM,
        "prong_tip_height_mm": DEFAULT_PRONG_TIP_HEIGHT_MM,
    }
    parameters = {}
    for name, default in defaults.items():
        value = overrides.get(name, default)
        if (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not math.isfinite(value)
            or value <= MIN_EXCLUSIVE_DIMENSION_MM
        ):
            raise ValueError(f"{name} must be a positive finite number")
        parameters[name] = float(value)

    maximum_edge_radius = min(
        parameters["band_width_mm"],
        parameters["radial_thickness_mm"],
    ) / HALF_DIVISOR
    if parameters["edge_radius_mm"] >= maximum_edge_radius:
        raise ValueError(
            "edge_radius_mm must be less than half the smaller "
            "band cross-section dimension"
        )
    return parameters


def presentation_camera_spec(parameters):
    del parameters
    return {
        "eye_mm": PRESENTATION_CAMERA_EYE_MM,
        "target_mm": PRESENTATION_CAMERA_TARGET_MM,
        "up": PRESENTATION_CAMERA_UP_VECTOR,
        "extent_mm": PRESENTATION_CAMERA_EXTENT_MM,
    }


def _chamfered_square_points(size_mm, chamfer_ratio):
    half_size_mm = size_mm / HALF_DIVISOR
    chamfer_mm = size_mm * chamfer_ratio
    return (
        (-half_size_mm + chamfer_mm, -half_size_mm),
        (half_size_mm - chamfer_mm, -half_size_mm),
        (half_size_mm, -half_size_mm + chamfer_mm),
        (half_size_mm, half_size_mm - chamfer_mm),
        (half_size_mm - chamfer_mm, half_size_mm),
        (-half_size_mm + chamfer_mm, half_size_mm),
        (-half_size_mm, half_size_mm - chamfer_mm),
        (-half_size_mm, -half_size_mm + chamfer_mm),
    )


def princess_profile_specs(parameters):
    stone_size_mm = parameters["center_stone_size_mm"]
    table_size_mm = stone_size_mm * parameters["center_table_ratio"]
    pavilion_size_mm = (
        stone_size_mm * parameters["center_pavilion_break_ratio"]
    )
    crown_size_mm = stone_size_mm * parameters["center_crown_break_ratio"]
    lower_girdle_height_mm = (
        parameters["center_girdle_height_mm"]
        - parameters["center_girdle_thickness_mm"]
    )
    definitions = (
        (
            parameters["center_culet_height_mm"],
            parameters["center_culet_size_mm"],
            parameters["culet_chamfer_ratio"],
        ),
        (
            parameters["center_pavilion_break_height_mm"],
            pavilion_size_mm,
            parameters["pavilion_chamfer_ratio"],
        ),
        (
            lower_girdle_height_mm,
            stone_size_mm,
            parameters["girdle_chamfer_ratio"],
        ),
        (
            parameters["center_girdle_height_mm"],
            stone_size_mm,
            parameters["girdle_chamfer_ratio"],
        ),
        (
            parameters["center_crown_break_height_mm"],
            crown_size_mm,
            parameters["crown_chamfer_ratio"],
        ),
        (
            parameters["center_table_height_mm"],
            table_size_mm,
            parameters["table_chamfer_ratio"],
        ),
    )
    return [
        {
            "height_mm": height_mm,
            "points_mm": _chamfered_square_points(size_mm, chamfer_ratio),
        }
        for height_mm, size_mm, chamfer_ratio in definitions
    ]


def shoulder_stone_placements(parameters):
    outer_radius_mm = (
        parameters["inside_diameter_mm"] / HALF_DIVISOR
        + parameters["radial_thickness_mm"]
    )
    girdle_radius_mm = (
        outer_radius_mm - parameters["shoulder_girdle_inset_mm"]
    )
    placements = []
    for side_sign in SIDE_SIGNS:
        side_name = "right" if side_sign > 0 else "left"
        for offset_degrees in SHOULDER_ANGLE_OFFSETS_DEGREES:
            offset_radians = math.radians(offset_degrees)
            radial_x = side_sign * math.sin(offset_radians)
            radial_z = math.cos(offset_radians)
            placements.append(
                {
                    "side": side_name,
                    "center_mm": (
                        girdle_radius_mm * radial_x,
                        AXIAL_CENTER_MM,
                        girdle_radius_mm * radial_z,
                    ),
                    "axis": (radial_x, AXIAL_CENTER_MM, radial_z),
                }
            )
    return placements


def shoulder_bead_centers(parameters):
    placements = shoulder_stone_placements(parameters)
    outer_radius_mm = (
        parameters["inside_diameter_mm"] / HALF_DIVISOR
        + parameters["radial_thickness_mm"]
        - parameters["shoulder_bead_radial_inset_mm"]
    )
    centers = []
    for side_name in ("left", "right"):
        side_centers = [
            placement["center_mm"]
            for placement in placements
            if placement["side"] == side_name
        ]
        for first, second in zip(side_centers, side_centers[1:]):
            middle_x = (first[0] + second[0]) / HALF_DIVISOR
            middle_z = (first[2] + second[2]) / HALF_DIVISOR
            middle_radius = math.hypot(middle_x, middle_z)
            surface_x = middle_x * outer_radius_mm / middle_radius
            surface_z = middle_z * outer_radius_mm / middle_radius
            for axial_sign in SIDE_SIGNS:
                centers.append(
                    (
                        surface_x,
                        axial_sign
                        * parameters["shoulder_bead_axial_offset_mm"],
                        surface_z,
                    )
                )
    return centers


def shoulder_seat_specs(parameters):
    placements = shoulder_stone_placements(parameters)
    angles = SHOULDER_ANGLE_OFFSETS_DEGREES * len(SIDE_SIGNS)
    inner_radius_mm = parameters["shoulder_seat_inner_diameter_mm"] / HALF_DIVISOR
    outer_radius_mm = parameters["shoulder_seat_outer_diameter_mm"] / HALF_DIVISOR
    specs = []
    for placement, angle_degrees in zip(placements, angles):
        center_mm = placement["center_mm"]
        axis = placement["axis"]
        specs.append(
            {
                "angle_degrees": angle_degrees,
                "inner_radius_mm": inner_radius_mm,
                "outer_radius_mm": outer_radius_mm,
                "start_mm": tuple(
                    center_mm[index]
                    - axis[index] * parameters["shoulder_seat_inset_depth_mm"]
                    for index in range(COORDINATE_COUNT)
                ),
                "end_mm": tuple(
                    center_mm[index]
                    + axis[index]
                    * parameters["shoulder_seat_outward_length_mm"]
                    for index in range(COORDINATE_COUNT)
                ),
            }
        )
    return specs


def halo_stone_placements(parameters):
    half_span_mm = parameters["halo_half_span_mm"]
    height_mm = parameters["halo_height_mm"]
    placements = []
    side_definitions = (
        ("front", (0.0, -1.0, 0.0)),
        ("back", (0.0, 1.0, 0.0)),
        ("left", (-1.0, 0.0, 0.0)),
        ("right", (1.0, 0.0, 0.0)),
    )
    for side_name, axis in side_definitions:
        for offset_mm in HALO_STONE_OFFSETS_MM:
            if side_name in ("front", "back"):
                center_mm = (
                    offset_mm,
                    axis[1] * half_span_mm,
                    height_mm,
                )
            else:
                center_mm = (
                    axis[0] * half_span_mm,
                    offset_mm,
                    height_mm,
                )
            placements.append(
                {
                    "side": side_name,
                    "center_mm": center_mm,
                    "axis": axis,
                }
            )
    return placements


def halo_gallery_segments(parameters):
    half_span_mm = parameters["halo_half_span_mm"]
    corners = (
        (-half_span_mm, -half_span_mm),
        (half_span_mm, -half_span_mm),
        (half_span_mm, half_span_mm),
        (-half_span_mm, half_span_mm),
    )
    segments = []
    for height_mm, level_name in (
        (parameters["halo_lower_wire_height_mm"], "Lower"),
        (parameters["halo_upper_wire_height_mm"], "Upper"),
    ):
        for index, start in enumerate(corners):
            end = corners[(index + PLACEMENT_INDEX_START) % len(corners)]
            segments.append(
                {
                    "kind": "wire",
                    "name": f"{level_name} Gallery Wire {index + PLACEMENT_INDEX_START}",
                    "start_mm": (start[0], start[1], height_mm),
                    "end_mm": (end[0], end[1], height_mm),
                    "diameter_mm": parameters["halo_wire_diameter_mm"],
                }
            )
    for index, corner in enumerate(corners):
        segments.append(
            {
                "kind": "post",
                "name": f"Gallery Corner Post {index + PLACEMENT_INDEX_START}",
                "start_mm": (
                    corner[0],
                    corner[1],
                    parameters["halo_lower_wire_height_mm"],
                ),
                "end_mm": (
                    corner[0],
                    corner[1],
                    parameters["halo_upper_wire_height_mm"],
                ),
                "diameter_mm": parameters["halo_post_diameter_mm"],
            }
        )
    return segments


def halo_separator_centers(parameters):
    offsets = tuple(
        (first + second) / HALF_DIVISOR
        for first, second in zip(
            HALO_STONE_OFFSETS_MM,
            HALO_STONE_OFFSETS_MM[PLACEMENT_INDEX_START:],
        )
    )
    half_span_mm = parameters["halo_half_span_mm"]
    height_mm = parameters["halo_height_mm"]
    centers = []
    for side_name in ("front", "back", "left", "right"):
        for offset_mm in offsets:
            if side_name == "front":
                centers.append((offset_mm, -half_span_mm, height_mm))
            elif side_name == "back":
                centers.append((offset_mm, half_span_mm, height_mm))
            elif side_name == "left":
                centers.append((-half_span_mm, offset_mm, height_mm))
            else:
                centers.append((half_span_mm, offset_mm, height_mm))
    return centers


def prong_paths(parameters):
    paths = []
    for tangential_sign in SIDE_SIGNS:
        for axial_sign in SIDE_SIGNS:
            paths.append(
                [
                    (
                        tangential_sign
                        * parameters["prong_root_tangential_mm"],
                        axial_sign * parameters["prong_root_axial_mm"],
                        parameters["prong_root_height_mm"],
                    ),
                    (
                        tangential_sign
                        * parameters["prong_mid_tangential_mm"],
                        axial_sign * parameters["prong_mid_axial_mm"],
                        parameters["prong_mid_height_mm"],
                    ),
                    (
                        tangential_sign
                        * parameters["prong_upper_tangential_mm"],
                        axial_sign * parameters["prong_upper_axial_mm"],
                        parameters["prong_upper_height_mm"],
                    ),
                    (
                        tangential_sign
                        * parameters["prong_tip_tangential_mm"],
                        axial_sign * parameters["prong_tip_axial_mm"],
                        parameters["prong_tip_height_mm"],
                    ),
                ]
            )
    return paths


def prong_profile_specs(parameters):
    diameters_mm = (
        parameters["prong_root_profile_diameter_mm"],
        parameters["prong_mid_profile_diameter_mm"],
        parameters["prong_upper_profile_diameter_mm"],
        parameters["prong_tip_profile_diameter_mm"],
    )
    return [
        [
            {
                "point_mm": point_mm,
                "diameter_mm": diameter_mm,
                "plane_kind": "offset_xy",
            }
            for point_mm, diameter_mm in zip(path, diameters_mm)
        ]
        for path in prong_paths(parameters)
    ]


MILLIMETERS = "mm"
CENTIMETERS = "cm"
DESIGN_PRODUCT_TYPE = "DesignProductType"
FIRST_ITEM_INDEX = 0
ORIGIN_COORDINATE = 0.0
ONE = 1.0
TWO = 2.0
FOUR = 4.0
FULL_REVOLUTION_RADIANS = math.tau
SQUARE_SIDE_COUNT = 4
COORDINATE_COUNT = 3
ROUND_STONE_SIDE_COUNT = 8
PRONG_SAMPLE_SEGMENT_COUNT = 12
PRONG_SEGMENT_OVERLAP_MM = 0.12
ROUND_GIRDLE_RADIUS_FACTOR = 0.5
ROUND_TABLE_RADIUS_FACTOR = 0.28
ROUND_CULET_RADIUS_FACTOR = 0.04
ROUND_TABLE_HEIGHT_FACTOR = 0.28
ROUND_CULET_DEPTH_FACTOR = 0.58
POLYGON_START_ROTATION_RADIANS = math.pi / FOUR
GOLD_APPEARANCE_TOKENS = ("gold", "yellow", "polished")
STONE_APPEARANCE_TOKENS = (
    "crystal",
    "diamond",
    "clear",
    "glass",
    "gem",
)
ACCENT_STONE_APPEARANCE_TOKENS = (
    "diamond",
    "crystal",
    "clear",
    "glass",
)
GOLD_APPEARANCE_SUFFIX = " - Engagement Ring Metal"
STONE_APPEARANCE_SUFFIX = " - Engagement Ring Stones"
ACCENT_STONE_APPEARANCE_SUFFIX = " - Engagement Ring Accent Stones"
BAND_BODY_NAME = "Size 5.25 Yellow Gold Engagement Ring Band"
CENTER_STONE_COMPONENT_NAME = "1.7 ct Princess Center Diamond"
CENTER_STONE_BODY_NAME = "6.5 mm Princess Cut Diamond"
HALO_STONE_COMPONENT_NAME = "0.9 mm Hidden Halo Diamond"
SHOULDER_STONE_COMPONENT_NAME = "2.3 mm Shoulder Diamond"
HALO_RAIL_NAME_PREFIX = "Hidden Halo Rail"
PRONG_NAME_PREFIX = "Curved 45 Degree Prong"
PRONG_TIP_NAME_PREFIX = "Rounded Prong Tip"
SHOULDER_BEAD_NAME_PREFIX = "Shoulder Pave Bead"
PLACEMENT_INDEX_START = 1


def fusion_mesh_arrays(mesh, millimeter_scale):
    coordinates = [
        round(value * millimeter_scale, MESH_COORDINATE_DECIMAL_PLACES)
        for vertex in mesh.vertices_mm
        for value in vertex
    ]
    indices = [index for triangle in mesh.triangles for index in triangle]
    return coordinates, indices


def _millimeters_to_centimeters(design, value_mm):
    return design.unitsManager.evaluateExpression(
        f"{value_mm} {MILLIMETERS}",
        CENTIMETERS,
    )


def _point_mm(design, coordinates_mm):
    import adsk.core

    return adsk.core.Point3D.create(
        _millimeters_to_centimeters(design, coordinates_mm[0]),
        _millimeters_to_centimeters(design, coordinates_mm[1]),
        _millimeters_to_centimeters(design, coordinates_mm[2]),
    )


def _vector(coordinates):
    import adsk.core

    return adsk.core.Vector3D.create(*coordinates)


def _copy_best_appearance(app, design, tokens, suffix):
    appearances_by_name = {}
    libraries = app.materialLibraries
    for library_index in range(libraries.count):
        appearances = libraries.item(library_index).appearances
        for appearance_index in range(appearances.count):
            appearance = appearances.item(appearance_index)
            appearances_by_name.setdefault(appearance.name, appearance)

    selected_name = select_appearance_name(
        list(appearances_by_name),
        tokens,
    )
    if selected_name is None:
        raise RuntimeError("no suitable appearance is installed in Fusion")
    source = appearances_by_name[selected_name]
    return design.appearances.addByCopy(source, source.name + suffix)


def _create_band(root_component, design, parameters):
    import adsk.core
    import adsk.fusion

    sketch = root_component.sketches.add(root_component.xYConstructionPlane)
    points_mm = band_profile_points(parameters)

    def profile_point(name):
        radial_mm, axial_mm = points_mm[name]
        return _point_mm(
            design,
            (radial_mm, axial_mm, ORIGIN_COORDINATE),
        )

    lines = sketch.sketchCurves.sketchLines
    arcs = sketch.sketchCurves.sketchArcs
    lines.addByTwoPoints(profile_point("top_left"), profile_point("top_right"))
    arcs.addByThreePoints(
        profile_point("top_right"),
        profile_point("top_right_mid"),
        profile_point("right_top"),
    )
    lines.addByTwoPoints(
        profile_point("right_top"),
        profile_point("right_bottom"),
    )
    arcs.addByThreePoints(
        profile_point("right_bottom"),
        profile_point("bottom_right_mid"),
        profile_point("bottom_right"),
    )
    lines.addByTwoPoints(
        profile_point("bottom_right"),
        profile_point("bottom_left"),
    )
    arcs.addByThreePoints(
        profile_point("bottom_left"),
        profile_point("bottom_left_mid"),
        profile_point("left_bottom"),
    )
    lines.addByTwoPoints(
        profile_point("left_bottom"),
        profile_point("left_top"),
    )
    arcs.addByThreePoints(
        profile_point("left_top"),
        profile_point("top_left_mid"),
        profile_point("top_left"),
    )

    axis_extent_mm = parameters["band_width_mm"]
    axis = lines.addByTwoPoints(
        _point_mm(
            design,
            (ORIGIN_COORDINATE, -axis_extent_mm, ORIGIN_COORDINATE),
        ),
        _point_mm(
            design,
            (ORIGIN_COORDINATE, axis_extent_mm, ORIGIN_COORDINATE),
        ),
    )
    axis.isConstruction = True

    profile = sketch.profiles.item(FIRST_ITEM_INDEX)
    revolves = root_component.features.revolveFeatures
    revolve_input = revolves.createInput(
        profile,
        axis,
        adsk.fusion.FeatureOperations.NewBodyFeatureOperation,
    )
    revolve_input.setAngleExtent(
        False,
        adsk.core.ValueInput.createByReal(FULL_REVOLUTION_RADIANS),
    )
    revolve = revolves.add(revolve_input)
    body = revolve.bodies.item(FIRST_ITEM_INDEX)
    body.name = BAND_BODY_NAME
    return body


def _create_offset_plane(component, design, height_mm):
    import adsk.core

    planes = component.constructionPlanes
    plane_input = planes.createInput()
    plane_input.setByOffset(
        component.xYConstructionPlane,
        adsk.core.ValueInput.createByReal(
            _millimeters_to_centimeters(design, height_mm)
        ),
    )
    return planes.add(plane_input)


def _polygon_profile(
    component,
    design,
    height_mm,
    radius_mm,
    side_count,
    rotation_radians,
):
    import adsk.core

    plane = _create_offset_plane(component, design, height_mm)
    sketch = component.sketches.add(plane)
    points = []
    for index in range(side_count):
        angle = rotation_radians + math.tau * index / side_count
        points.append(
            adsk.core.Point3D.create(
                _millimeters_to_centimeters(
                    design,
                    radius_mm * math.cos(angle),
                ),
                _millimeters_to_centimeters(
                    design,
                    radius_mm * math.sin(angle),
                ),
                ORIGIN_COORDINATE,
            )
        )
    lines = sketch.sketchCurves.sketchLines
    for index in range(side_count):
        lines.addByTwoPoints(points[index], points[(index + 1) % side_count])
    return sketch.profiles.item(FIRST_ITEM_INDEX)


def _point_profile(component, design, height_mm, points_mm):
    import adsk.core

    plane = _create_offset_plane(component, design, height_mm)
    sketch = component.sketches.add(plane)
    points = [
        adsk.core.Point3D.create(
            _millimeters_to_centimeters(design, point_mm[0]),
            _millimeters_to_centimeters(design, point_mm[1]),
            ORIGIN_COORDINATE,
        )
        for point_mm in points_mm
    ]
    lines = sketch.sketchCurves.sketchLines
    for index in range(len(points)):
        lines.addByTwoPoints(
            points[index],
            points[(index + PLACEMENT_INDEX_START) % len(points)],
        )
    return sketch.profiles.item(FIRST_ITEM_INDEX)


def _loft_profiles(component, profiles, body_name):
    import adsk.fusion

    lofts = component.features.loftFeatures
    loft_input = lofts.createInput(
        adsk.fusion.FeatureOperations.NewBodyFeatureOperation
    )
    for profile in profiles:
        loft_input.loftSections.add(profile)
    loft_input.isSolid = True
    loft = lofts.add(loft_input)
    body = loft.bodies.item(FIRST_ITEM_INDEX)
    body.name = body_name
    return body


def _create_princess_stone(component, design, parameters):
    profiles = tuple(
        _point_profile(
            component,
            design,
            profile["height_mm"],
            profile["points_mm"],
        )
        for profile in princess_profile_specs(parameters)
    )
    return _loft_profiles(component, profiles, CENTER_STONE_BODY_NAME)


def _create_round_stone_body(
    component,
    design,
    diameter_mm,
    component_name,
):
    component.name = component_name
    profiles = (
        _polygon_profile(
            component,
            design,
            -diameter_mm * ROUND_CULET_DEPTH_FACTOR,
            diameter_mm * ROUND_CULET_RADIUS_FACTOR,
            ROUND_STONE_SIDE_COUNT,
            ORIGIN_COORDINATE,
        ),
        _polygon_profile(
            component,
            design,
            ORIGIN_COORDINATE,
            diameter_mm * ROUND_GIRDLE_RADIUS_FACTOR,
            ROUND_STONE_SIDE_COUNT,
            ORIGIN_COORDINATE,
        ),
        _polygon_profile(
            component,
            design,
            diameter_mm * ROUND_TABLE_HEIGHT_FACTOR,
            diameter_mm * ROUND_TABLE_RADIUS_FACTOR,
            ROUND_STONE_SIDE_COUNT,
            ORIGIN_COORDINATE,
        ),
    )
    body = _loft_profiles(component, profiles, component_name)
    return body


def _create_mesh_body(
    component,
    design,
    mesh,
    component_name,
    body_name,
):
    component.name = component_name
    millimeter_scale = _millimeters_to_centimeters(design, ONE)
    coordinates, indices = fusion_mesh_arrays(mesh, millimeter_scale)
    body = component.meshBodies.addByTriangleMeshData(
        coordinates,
        indices,
        [],
        [],
    )
    if body is None:
        raise RuntimeError(f"Fusion could not create mesh body: {body_name}")
    body.name = body_name
    return body


def _open_reference_princess_body(app, target_document):
    import adsk.fusion

    reference_document = select_reference_princess_document(
        app.documents,
        target_document,
    )
    reference_design = adsk.fusion.Design.cast(
        reference_document.products.itemByProductType(DESIGN_PRODUCT_TYPE)
    )
    if reference_design is None:
        raise RuntimeError("Everwood princess reference is not a Fusion design")
    source_bodies = reference_design.rootComponent.bRepBodies
    if source_bodies.count < PLACEMENT_INDEX_START:
        raise RuntimeError("Everwood princess reference has no solid body")
    return source_bodies.item(FIRST_ITEM_INDEX)


def _create_reference_princess_body(
    component,
    source_body,
    target_size_mm,
):
    import adsk.core
    import adsk.fusion

    bounds = source_body.boundingBox
    spec = reference_princess_transform_spec(
        (bounds.minPoint.x, bounds.minPoint.y, bounds.minPoint.z),
        (bounds.maxPoint.x, bounds.maxPoint.y, bounds.maxPoint.z),
        target_size_mm,
    )
    transform = adsk.core.Matrix3D.create()
    for row_index, row in enumerate(spec["matrix_rows"]):
        for column_index, value in enumerate(row):
            transform.setCell(row_index, column_index, value)

    manager = adsk.fusion.TemporaryBRepManager.get()
    temporary_body = manager.copy(source_body)
    if temporary_body is None:
        raise RuntimeError("Fusion could not copy the Everwood princess body")
    if not manager.transform(temporary_body, transform):
        raise RuntimeError("Fusion could not scale the Everwood princess body")
    component.name = CENTER_STONE_COMPONENT_NAME
    return persist_temporary_bodies(
        component,
        [temporary_body],
        [CENTER_STONE_BODY_NAME],
    )[FIRST_ITEM_INDEX]


def _create_rectangular_prism(
    root_component,
    design,
    center_x_mm,
    center_y_mm,
    base_z_mm,
    length_x_mm,
    length_y_mm,
    height_mm,
    body_name,
):
    import adsk.core
    import adsk.fusion

    plane = _create_offset_plane(root_component, design, base_z_mm)
    sketch = root_component.sketches.add(plane)
    half_x_mm = length_x_mm / TWO
    half_y_mm = length_y_mm / TWO
    lines = sketch.sketchCurves.sketchLines
    lines.addTwoPointRectangle(
        adsk.core.Point3D.create(
            _millimeters_to_centimeters(design, center_x_mm - half_x_mm),
            _millimeters_to_centimeters(design, center_y_mm - half_y_mm),
            ORIGIN_COORDINATE,
        ),
        adsk.core.Point3D.create(
            _millimeters_to_centimeters(design, center_x_mm + half_x_mm),
            _millimeters_to_centimeters(design, center_y_mm + half_y_mm),
            ORIGIN_COORDINATE,
        ),
    )
    profile = sketch.profiles.item(FIRST_ITEM_INDEX)
    extrudes = root_component.features.extrudeFeatures
    extrude_input = extrudes.createInput(
        profile,
        adsk.fusion.FeatureOperations.NewBodyFeatureOperation,
    )
    extrude_input.setDistanceExtent(
        False,
        adsk.core.ValueInput.createByReal(
            _millimeters_to_centimeters(design, height_mm)
        ),
    )
    extrude = extrudes.add(extrude_input)
    body = extrude.bodies.item(FIRST_ITEM_INDEX)
    body.name = body_name
    return body


def _create_halo_bridge(root_component, design, parameters):
    import adsk.fusion

    half_span_mm = parameters["halo_half_span_mm"]
    rail_height_mm = (
        parameters["halo_height_mm"]
        - parameters["halo_stone_diameter_mm"] / FOUR
    )
    rail_specs = (
        (
            (-half_span_mm, -half_span_mm, rail_height_mm),
            (half_span_mm, -half_span_mm, rail_height_mm),
            "Front",
        ),
        (
            (-half_span_mm, half_span_mm, rail_height_mm),
            (half_span_mm, half_span_mm, rail_height_mm),
            "Back",
        ),
        (
            (-half_span_mm, -half_span_mm, rail_height_mm),
            (-half_span_mm, half_span_mm, rail_height_mm),
            "Left",
        ),
        (
            (half_span_mm, -half_span_mm, rail_height_mm),
            (half_span_mm, half_span_mm, rail_height_mm),
            "Right",
        ),
    )
    manager = adsk.fusion.TemporaryBRepManager.get()
    rail_radius_cm = _millimeters_to_centimeters(
        design,
        parameters["halo_rail_thickness_mm"] / TWO,
    )
    temporary_bodies = [
        manager.createCylinderOrCone(
            _point_mm(design, start_mm),
            rail_radius_cm,
            _point_mm(design, end_mm),
            rail_radius_cm,
        )
        for start_mm, end_mm, _ in rail_specs
    ]
    body_names = [
        f"{HALO_RAIL_NAME_PREFIX} - {label}"
        for _, _, label in rail_specs
    ]
    return persist_temporary_bodies(
        root_component,
        temporary_bodies,
        body_names,
    )


def _quadratic_bezier_points(path, segment_count):
    start, control, end = path
    points = []
    for index in range(segment_count + PLACEMENT_INDEX_START):
        position = index / segment_count
        inverse = ONE - position
        points.append(
            tuple(
                inverse * inverse * start[axis]
                + TWO * inverse * position * control[axis]
                + position * position * end[axis]
                for axis in range(COORDINATE_COUNT)
            )
        )
    return points


def expanded_segment_endpoints(start, end, overlap):
    direction = tuple(
        end[index] - start[index]
        for index in range(COORDINATE_COUNT)
    )
    length = math.sqrt(sum(value * value for value in direction))
    if length <= ORIGIN_COORDINATE:
        raise ValueError("prong segment length must be positive")
    unit = tuple(value / length for value in direction)
    return (
        tuple(
            start[index] - unit[index] * overlap
            for index in range(COORDINATE_COUNT)
        ),
        tuple(
            end[index] + unit[index] * overlap
            for index in range(COORDINATE_COUNT)
        ),
    )


def _union_temporary_body(manager, target, tool):
    import adsk.fusion

    if not manager.booleanOperation(
        target,
        tool,
        adsk.fusion.BooleanTypes.UnionBooleanType,
    ):
        raise RuntimeError("Fusion could not join a prong segment")


def persist_temporary_bodies(root_component, temporary_bodies, body_names):
    if len(temporary_bodies) != len(body_names):
        raise ValueError("temporary body and name counts must match")
    base_feature = root_component.features.baseFeatures.add()
    base_feature.startEdit()
    source_bodies = []
    try:
        for temporary_body, body_name in zip(
            temporary_bodies,
            body_names,
        ):
            body = root_component.bRepBodies.add(
                temporary_body,
                base_feature,
            )
            body.name = body_name
            source_bodies.append(body)
    finally:
        base_feature.finishEdit()
    result_collection = getattr(base_feature, "bodies", None)
    if result_collection is None:
        return source_bodies
    result_bodies = []
    for body_index, body_name in enumerate(body_names):
        result_body = result_collection.item(body_index)
        result_body.name = body_name
        result_bodies.append(result_body)
    return result_bodies


def _cut_shoulder_seats(
    root_component,
    design,
    band_body,
    seat_specs,
):
    import adsk.core
    import adsk.fusion

    manager = adsk.fusion.TemporaryBRepManager.get()
    temporary_cutters = [
        manager.createCylinderOrCone(
            _point_mm(design, spec["start_mm"]),
            _millimeters_to_centimeters(design, spec["inner_radius_mm"]),
            _point_mm(design, spec["end_mm"]),
            _millimeters_to_centimeters(design, spec["outer_radius_mm"]),
        )
        for spec in seat_specs
    ]
    cutter_names = [
        f"Shoulder Seat Cutter {index}"
        for index in range(
            PLACEMENT_INDEX_START,
            len(seat_specs) + PLACEMENT_INDEX_START,
        )
    ]
    cutter_bodies = persist_temporary_bodies(
        root_component,
        temporary_cutters,
        cutter_names,
    )
    tool_collection = adsk.core.ObjectCollection.create()
    for cutter_body in cutter_bodies:
        tool_collection.add(cutter_body)
    combine_features = root_component.features.combineFeatures
    combine_input = combine_features.createInput(band_body, tool_collection)
    combine_input.operation = adsk.fusion.FeatureOperations.CutFeatureOperation
    combine_input.isKeepToolBodies = False
    combine_feature = combine_features.add(combine_input)
    if combine_feature is None:
        raise RuntimeError("Fusion could not cut the shoulder seats")
    return combine_feature


def _create_prongs(root_component, design, parameters):
    import adsk.core
    import adsk.fusion

    bodies = []
    for prong_index, path in enumerate(
        prong_paths(parameters),
        start=PLACEMENT_INDEX_START,
    ):
        sketch = root_component.sketches.add(
            root_component.xYConstructionPlane
        )
        fit_points = adsk.core.ObjectCollection.create()
        for coordinates_mm in path:
            fit_points.add(_point_mm(design, coordinates_mm))
        spline = sketch.sketchCurves.sketchFittedSplines.add(fit_points)
        feature_path = root_component.features.createPath(spline)
        pipe_features = root_component.features.pipeFeatures
        pipe_input = pipe_features.createInput(
            feature_path,
            adsk.fusion.FeatureOperations.NewBodyFeatureOperation,
        )
        pipe_input.sectionSize = adsk.core.ValueInput.createByReal(
            _millimeters_to_centimeters(
                design,
                parameters["prong_diameter_mm"],
            )
        )
        pipe_feature = pipe_features.add(pipe_input)
        body = pipe_feature.bodies.item(FIRST_ITEM_INDEX)
        body.name = f"{PRONG_NAME_PREFIX} {prong_index}"
        sketch.isVisible = False
        bodies.append(body)
    return bodies


def _path_tangent(path, point_index):
    if point_index == FIRST_ITEM_INDEX:
        start = path[FIRST_ITEM_INDEX]
        end = path[PLACEMENT_INDEX_START]
    elif point_index == len(path) - PLACEMENT_INDEX_START:
        start = path[point_index - PLACEMENT_INDEX_START]
        end = path[point_index]
    else:
        start = path[point_index - PLACEMENT_INDEX_START]
        end = path[point_index + PLACEMENT_INDEX_START]
    return tuple(
        end[axis] - start[axis]
        for axis in range(COORDINATE_COUNT)
    )


def _create_tapered_prongs(root_component, design, parameters):
    import adsk.core
    import adsk.fusion

    bodies = []
    for prong_index, specs in enumerate(
        prong_profile_specs(parameters),
        start=PLACEMENT_INDEX_START,
    ):
        path = [spec["point_mm"] for spec in specs]
        centerline_sketch = root_component.sketches.add(
            root_component.xYConstructionPlane
        )
        fit_points = adsk.core.ObjectCollection.create()
        for point_mm in path:
            fit_points.add(_point_mm(design, point_mm))
        spline = centerline_sketch.sketchCurves.sketchFittedSplines.add(
            fit_points
        )
        profiles = []
        profile_planes = []
        profile_sketches = []
        for spec in specs:
            profile_plane = _create_offset_plane(
                root_component,
                design,
                spec["point_mm"][2],
            )
            profile_sketch = root_component.sketches.add(profile_plane)
            profile_sketch.sketchCurves.sketchCircles.addByCenterRadius(
                adsk.core.Point3D.create(
                    _millimeters_to_centimeters(
                        design,
                        spec["point_mm"][0],
                    ),
                    _millimeters_to_centimeters(
                        design,
                        spec["point_mm"][1],
                    ),
                    ORIGIN_COORDINATE,
                ),
                _millimeters_to_centimeters(
                    design,
                    spec["diameter_mm"] / TWO,
                ),
            )
            profiles.append(profile_sketch.profiles.item(FIRST_ITEM_INDEX))
            profile_planes.append(profile_plane)
            profile_sketches.append(profile_sketch)

        lofts = root_component.features.loftFeatures
        loft_input = lofts.createInput(
            adsk.fusion.FeatureOperations.NewBodyFeatureOperation
        )
        for profile in profiles:
            loft_input.loftSections.add(profile)
        loft_input.centerLineOrRails.addCenterLine(spline)
        loft_input.isSolid = True
        loft_feature = lofts.add(loft_input)
        body = loft_feature.bodies.item(FIRST_ITEM_INDEX)
        body.name = f"{PRONG_NAME_PREFIX} {prong_index}"
        centerline_sketch.isVisible = False
        for profile_sketch in profile_sketches:
            profile_sketch.isVisible = False
        for profile_plane in profile_planes:
            profile_plane.isLightBulbOn = False
        bodies.append(body)
    return bodies


def _create_gold_spheres(
    root_component,
    design,
    centers_mm,
    diameter_mm,
    name_prefix,
):
    import adsk.fusion

    manager = adsk.fusion.TemporaryBRepManager.get()
    radius_cm = _millimeters_to_centimeters(design, diameter_mm / TWO)
    temporary_bodies = [
        manager.createSphere(_point_mm(design, center_mm), radius_cm)
        for center_mm in centers_mm
    ]
    body_names = [
        f"{name_prefix} {index}"
        for index in range(
            PLACEMENT_INDEX_START,
            len(centers_mm) + PLACEMENT_INDEX_START,
        )
    ]
    return persist_temporary_bodies(
        root_component,
        temporary_bodies,
        body_names,
    )


def _create_halo_gallery(root_component, design, parameters):
    import adsk.fusion

    manager = adsk.fusion.TemporaryBRepManager.get()
    segments = halo_gallery_segments(parameters)
    temporary_bodies = [
        manager.createCylinderOrCone(
            _point_mm(design, segment["start_mm"]),
            _millimeters_to_centimeters(
                design,
                segment["diameter_mm"] / TWO,
            ),
            _point_mm(design, segment["end_mm"]),
            _millimeters_to_centimeters(
                design,
                segment["diameter_mm"] / TWO,
            ),
        )
        for segment in segments
    ]
    segment_bodies = persist_temporary_bodies(
        root_component,
        temporary_bodies,
        [segment["name"] for segment in segments],
    )
    separator_bodies = _create_gold_spheres(
        root_component,
        design,
        halo_separator_centers(parameters),
        parameters["halo_separator_diameter_mm"],
        "Hidden Halo Separator Bead",
    )
    return segment_bodies, separator_bodies


def _placement_transform(design, placement, shoulder):
    import adsk.core

    axis = placement["axis"]
    if shoulder:
        local_x = (axis[2], ORIGIN_COORDINATE, -axis[0])
        local_y = (ORIGIN_COORDINATE, ONE, ORIGIN_COORDINATE)
    else:
        local_x = (-axis[1], axis[0], ORIGIN_COORDINATE)
        local_y = (ORIGIN_COORDINATE, ORIGIN_COORDINATE, ONE)
    transform = adsk.core.Matrix3D.create()
    transform.setWithCoordinateSystem(
        _point_mm(design, placement["center_mm"]),
        _vector(local_x),
        _vector(local_y),
        _vector(axis),
    )
    return transform


def add_existing_occurrences(occurrences_collection, component, transforms):
    return [
        occurrences_collection.addExistingComponent(component, transform)
        for transform in transforms
    ]


def create_component_occurrences(
    occurrences_collection,
    transforms,
    body_builder,
):
    if not transforms:
        raise ValueError("at least one component transform is required")
    master_occurrence = occurrences_collection.addNewComponent(
        transforms[FIRST_ITEM_INDEX]
    )
    component = master_occurrence.component
    body = body_builder(component)
    occurrences = [master_occurrence] + add_existing_occurrences(
        occurrences_collection,
        component,
        transforms[PLACEMENT_INDEX_START:],
    )
    return master_occurrence, component, body, occurrences


def _create_and_place_stones(
    root_component,
    design,
    diameter_mm,
    component_name,
    placements,
    shoulder,
):
    mesh = gem_mesh.build_round_brilliant_mesh(diameter_mm)
    transforms = [
        _placement_transform(design, placement, shoulder)
        for placement in placements
    ]
    return create_component_occurrences(
        root_component.occurrences,
        transforms,
        lambda component: _create_mesh_body(
            component,
            design,
            mesh,
            component_name,
            component_name,
        ),
    )


def _hide_construction(root_component):
    visited = set()
    hidden_count = 0

    def visit(component):
        nonlocal hidden_count
        component_key = component.entityToken
        if component_key in visited:
            return
        visited.add(component_key)
        for sketch in component.sketches:
            sketch.isVisible = False
            hidden_count += PLACEMENT_INDEX_START
        for collection_name in (
            "constructionPlanes",
            "constructionAxes",
            "constructionPoints",
        ):
            collection = getattr(component, collection_name)
            for construction in collection:
                construction.isLightBulbOn = False
                hidden_count += PLACEMENT_INDEX_START
        for occurrence in component.occurrences:
            visit(occurrence.component)

    visit(root_component)
    return hidden_count


def _apply_presentation_view(app, design, parameters):
    import adsk.core

    spec = presentation_camera_spec(parameters)
    viewport = app.activeViewport
    camera = adsk.core.Camera.create()
    camera.eye = _point_mm(design, spec["eye_mm"])
    camera.target = _point_mm(design, spec["target_mm"])
    camera.upVector = _vector(spec["up"])
    camera.cameraType = adsk.core.CameraTypes.OrthographicCameraType
    extent_cm = _millimeters_to_centimeters(design, spec["extent_mm"])
    camera.setExtents(extent_cm, extent_cm)
    camera.isSmoothTransition = False
    viewport.camera = camera
    viewport.visualStyle = adsk.core.VisualStyles.ShadedVisualStyle
    viewport.refresh()


def run(context):
    import adsk.core
    import adsk.fusion

    parameters = ring_parameters(context.request.parameters)
    reference_princess_body = _open_reference_princess_body(
        context.app,
        context.document,
    )
    design = adsk.fusion.Design.cast(
        context.document.products.itemByProductType(DESIGN_PRODUCT_TYPE)
    )
    if design is None:
        raise RuntimeError("target document is not a Fusion design")
    root_component = design.rootComponent

    metal_appearance = _copy_best_appearance(
        context.app,
        design,
        GOLD_APPEARANCE_TOKENS,
        GOLD_APPEARANCE_SUFFIX,
    )
    stone_appearance = _copy_best_appearance(
        context.app,
        design,
        STONE_APPEARANCE_TOKENS,
        STONE_APPEARANCE_SUFFIX,
    )
    accent_stone_appearance = _copy_best_appearance(
        context.app,
        design,
        ACCENT_STONE_APPEARANCE_TOKENS,
        ACCENT_STONE_APPEARANCE_SUFFIX,
    )

    band_body = _create_band(root_component, design, parameters)
    band_body.appearance = metal_appearance
    seat_specs = shoulder_seat_specs(parameters)
    _cut_shoulder_seats(
        root_component,
        design,
        band_body,
        seat_specs,
    )

    halo_gallery_bodies, halo_separator_bodies = _create_halo_gallery(
        root_component,
        design,
        parameters,
    )
    for body in halo_gallery_bodies + halo_separator_bodies:
        body.appearance = metal_appearance

    prong_bodies = _create_tapered_prongs(
        root_component,
        design,
        parameters,
    )
    for body in prong_bodies:
        body.appearance = metal_appearance

    prong_tip_bodies = _create_gold_spheres(
        root_component,
        design,
        [path[-PLACEMENT_INDEX_START] for path in prong_paths(parameters)],
        parameters["prong_tip_diameter_mm"],
        PRONG_TIP_NAME_PREFIX,
    )
    for body in prong_tip_bodies:
        body.appearance = metal_appearance

    shoulder_bead_bodies = _create_gold_spheres(
        root_component,
        design,
        shoulder_bead_centers(parameters),
        parameters["shoulder_bead_diameter_mm"],
        SHOULDER_BEAD_NAME_PREFIX,
    )
    for body in shoulder_bead_bodies:
        body.appearance = metal_appearance

    center_transform = adsk.core.Matrix3D.create()
    center_transform.translation = adsk.core.Vector3D.create(
        ORIGIN_COORDINATE,
        ORIGIN_COORDINATE,
        _millimeters_to_centimeters(
            design,
            parameters["center_girdle_height_mm"],
        ),
    )
    center_occurrence = root_component.occurrences.addNewComponent(
        center_transform
    )
    center_component = center_occurrence.component
    center_component.name = CENTER_STONE_COMPONENT_NAME
    center_body = _create_reference_princess_body(
        center_component,
        reference_princess_body,
        parameters["center_stone_size_mm"],
    )
    center_body.appearance = stone_appearance

    (
        halo_master_occurrence,
        halo_component,
        halo_master_body,
        halo_occurrences,
    ) = _create_and_place_stones(
        root_component,
        design,
        parameters["halo_stone_diameter_mm"],
        HALO_STONE_COMPONENT_NAME,
        halo_stone_placements(parameters),
        False,
    )
    halo_master_body.appearance = accent_stone_appearance

    (
        shoulder_master_occurrence,
        shoulder_component,
        shoulder_master_body,
        shoulder_occurrences,
    ) = _create_and_place_stones(
        root_component,
        design,
        parameters["shoulder_stone_diameter_mm"],
        SHOULDER_STONE_COMPONENT_NAME,
        shoulder_stone_placements(parameters),
        True,
    )
    shoulder_master_body.appearance = accent_stone_appearance

    hidden_construction_count = _hide_construction(root_component)
    _apply_presentation_view(context.app, design, parameters)
    return {
        **parameters,
        "band_body_count": PLACEMENT_INDEX_START,
        "center_stone_count": PLACEMENT_INDEX_START,
        "prong_count": len(prong_bodies),
        "prong_tip_count": len(prong_tip_bodies),
        "prong_modeling": "tapered_centerline_loft",
        "center_profile_count": len(princess_profile_specs(parameters)),
        "halo_gallery_segment_count": len(halo_gallery_bodies),
        "halo_separator_count": len(halo_separator_bodies),
        "halo_diamond_count": len(halo_occurrences),
        "shoulder_diamond_count": len(shoulder_occurrences),
        "shoulder_seat_count": len(seat_specs),
        "shoulder_bead_count": len(shoulder_bead_bodies),
        "hidden_construction_count": hidden_construction_count,
        "metal_appearance_name": metal_appearance.name,
        "stone_appearance_name": stone_appearance.name,
        "accent_stone_appearance_name": accent_stone_appearance.name,
        "band_body_name": band_body.name,
        "center_stone_body_name": center_body.name,
        "center_stone_source": REFERENCE_PRINCESS_SOURCE_LABEL,
        "center_stone_face_count": center_body.faces.count,
    }
