import math
from collections import Counter
from dataclasses import dataclass


COORDINATE_COUNT = 3
HALF_DIVISOR = 2.0
FULL_REVOLUTION_RADIANS = math.tau
PRINCESS_EDGE_SUBDIVISION_COUNT = 3
PRINCESS_LOOP_POINT_COUNT = 24
ROUND_SYMMETRY_COUNT = 8
ROUND_GIRDLE_POINT_FACTOR = 2
CHAMFERED_SQUARE_CORNER_COUNT = 8
PRINCESS_LOWER_PAVILION_SIZE_RATIO = 0.43
PRINCESS_PAVILION_BREAK_SIZE_RATIO = 0.78
PRINCESS_LOWER_CROWN_SIZE_RATIO = 0.92
PRINCESS_CROWN_BREAK_SIZE_RATIO = 0.80
PRINCESS_TABLE_SIZE_RATIO = 0.58
PRINCESS_CULET_DEPTH_MM = -2.35
PRINCESS_LOWER_PAVILION_HEIGHT_MM = -1.80
PRINCESS_PAVILION_BREAK_HEIGHT_MM = -1.18
PRINCESS_LOWER_GIRDLE_HEIGHT_MM = -0.12
PRINCESS_UPPER_GIRDLE_HEIGHT_MM = 0.12
PRINCESS_LOWER_CROWN_HEIGHT_MM = 0.55
PRINCESS_CROWN_BREAK_HEIGHT_MM = 1.05
PRINCESS_TABLE_HEIGHT_MM = 1.55
PRINCESS_LOWER_PAVILION_CHAMFER_RATIO = 0.15
PRINCESS_PAVILION_CHAMFER_RATIO = 0.11
PRINCESS_GIRDLE_CHAMFER_RATIO = 0.035
PRINCESS_LOWER_CROWN_CHAMFER_RATIO = 0.05
PRINCESS_CROWN_CHAMFER_RATIO = 0.08
PRINCESS_TABLE_CHAMFER_RATIO = 0.06
ROUND_TABLE_DIAMETER_RATIO = 0.54
ROUND_CROWN_HEIGHT_RATIO = 0.155
ROUND_GIRDLE_THICKNESS_RATIO = 0.03
ROUND_PAVILION_DEPTH_RATIO = 0.429
ROUND_STAR_LENGTH_RATIO = 0.50
ROUND_LOWER_GIRDLE_LENGTH_RATIO = 0.75
FIRST_VERTEX_INDEX = 0
NEXT_INDEX_OFFSET = 1
TRIANGLE_VERTEX_COUNT = 3
ZERO_ROTATION_RADIANS = 0.0


@dataclass(frozen=True)
class MeshData:
    vertices_mm: tuple
    triangles: tuple

    def bounds_mm(self):
        axes = tuple(zip(*self.vertices_mm))
        return (
            tuple(min(axis) for axis in axes),
            tuple(max(axis) for axis in axes),
        )


def princess_levels():
    return (
        {
            "height_mm": PRINCESS_LOWER_PAVILION_HEIGHT_MM,
            "size_ratio": PRINCESS_LOWER_PAVILION_SIZE_RATIO,
            "chamfer_ratio": PRINCESS_LOWER_PAVILION_CHAMFER_RATIO,
        },
        {
            "height_mm": PRINCESS_PAVILION_BREAK_HEIGHT_MM,
            "size_ratio": PRINCESS_PAVILION_BREAK_SIZE_RATIO,
            "chamfer_ratio": PRINCESS_PAVILION_CHAMFER_RATIO,
        },
        {
            "height_mm": PRINCESS_LOWER_GIRDLE_HEIGHT_MM,
            "size_ratio": 1.0,
            "chamfer_ratio": PRINCESS_GIRDLE_CHAMFER_RATIO,
        },
        {
            "height_mm": PRINCESS_UPPER_GIRDLE_HEIGHT_MM,
            "size_ratio": 1.0,
            "chamfer_ratio": PRINCESS_GIRDLE_CHAMFER_RATIO,
        },
        {
            "height_mm": PRINCESS_LOWER_CROWN_HEIGHT_MM,
            "size_ratio": PRINCESS_LOWER_CROWN_SIZE_RATIO,
            "chamfer_ratio": PRINCESS_LOWER_CROWN_CHAMFER_RATIO,
        },
        {
            "height_mm": PRINCESS_CROWN_BREAK_HEIGHT_MM,
            "size_ratio": PRINCESS_CROWN_BREAK_SIZE_RATIO,
            "chamfer_ratio": PRINCESS_CROWN_CHAMFER_RATIO,
        },
        {
            "height_mm": PRINCESS_TABLE_HEIGHT_MM,
            "size_ratio": PRINCESS_TABLE_SIZE_RATIO,
            "chamfer_ratio": PRINCESS_TABLE_CHAMFER_RATIO,
        },
    )


def _chamfered_square_loop(size_mm, chamfer_ratio):
    half_size_mm = size_mm / HALF_DIVISOR
    chamfer_mm = size_mm * chamfer_ratio
    corners = (
        (-half_size_mm + chamfer_mm, -half_size_mm),
        (half_size_mm - chamfer_mm, -half_size_mm),
        (half_size_mm, -half_size_mm + chamfer_mm),
        (half_size_mm, half_size_mm - chamfer_mm),
        (half_size_mm - chamfer_mm, half_size_mm),
        (-half_size_mm + chamfer_mm, half_size_mm),
        (-half_size_mm, half_size_mm - chamfer_mm),
        (-half_size_mm, -half_size_mm + chamfer_mm),
    )
    points = []
    for index, start in enumerate(corners):
        end = corners[(index + NEXT_INDEX_OFFSET) % len(corners)]
        for subdivision_index in range(PRINCESS_EDGE_SUBDIVISION_COUNT):
            fraction = (
                subdivision_index / PRINCESS_EDGE_SUBDIVISION_COUNT
            )
            points.append(
                (
                    start[0] + (end[0] - start[0]) * fraction,
                    start[1] + (end[1] - start[1]) * fraction,
                )
            )
    if len(points) != PRINCESS_LOOP_POINT_COUNT:
        raise RuntimeError("princess loop point count is invalid")
    return tuple(points)


def _round_loop(radius_mm, segment_count, rotation_radians):
    return tuple(
        (
            radius_mm * math.cos(
                rotation_radians
                + FULL_REVOLUTION_RADIANS * index / segment_count
            ),
            radius_mm * math.sin(
                rotation_radians
                + FULL_REVOLUTION_RADIANS * index / segment_count
            ),
        )
        for index in range(segment_count)
    )


def _append_polar_loop(vertices, radius_mm, height_mm, point_count, rotation):
    indices = []
    for x_mm, y_mm in _round_loop(radius_mm, point_count, rotation):
        indices.append(len(vertices))
        vertices.append((x_mm, y_mm, height_mm))
    return tuple(indices)


def _triangulate_polygon(indices):
    return tuple(
        (indices[FIRST_VERTEX_INDEX], indices[index], indices[index + 1])
        for index in range(NEXT_INDEX_OFFSET, len(indices) - NEXT_INDEX_OFFSET)
    )


def _build_ring_mesh(bottom_height_mm, rings):
    if not rings:
        raise ValueError("at least one gemstone ring is required")
    ring_point_count = len(rings[FIRST_VERTEX_INDEX][1])
    if ring_point_count < TRIANGLE_VERTEX_COUNT:
        raise ValueError("gemstone rings require at least three points")
    if any(len(points) != ring_point_count for _, points in rings):
        raise ValueError("all gemstone rings must have equal point counts")

    vertices = [(0.0, 0.0, bottom_height_mm)]
    ring_indices = []
    for height_mm, points in rings:
        indices = []
        for x_mm, y_mm in points:
            indices.append(len(vertices))
            vertices.append((x_mm, y_mm, height_mm))
        ring_indices.append(tuple(indices))

    triangles = []
    first_ring = ring_indices[FIRST_VERTEX_INDEX]
    for index in range(ring_point_count):
        next_index = (index + NEXT_INDEX_OFFSET) % ring_point_count
        triangles.append(
            (
                FIRST_VERTEX_INDEX,
                first_ring[next_index],
                first_ring[index],
            )
        )

    for lower, upper in zip(ring_indices, ring_indices[NEXT_INDEX_OFFSET:]):
        for index in range(ring_point_count):
            next_index = (index + NEXT_INDEX_OFFSET) % ring_point_count
            triangles.append((lower[index], lower[next_index], upper[next_index]))
            triangles.append((lower[index], upper[next_index], upper[index]))

    top_center_index = len(vertices)
    top_height_mm = rings[-NEXT_INDEX_OFFSET][0]
    vertices.append((0.0, 0.0, top_height_mm))
    top_ring = ring_indices[-NEXT_INDEX_OFFSET]
    for index in range(ring_point_count):
        next_index = (index + NEXT_INDEX_OFFSET) % ring_point_count
        triangles.append(
            (top_center_index, top_ring[index], top_ring[next_index])
        )
    return MeshData(tuple(vertices), tuple(triangles))


def build_princess_mesh(size_mm, levels=None):
    if size_mm <= 0.0:
        raise ValueError("princess size must be positive")
    selected_levels = levels or princess_levels()
    rings = tuple(
        (
            level["height_mm"],
            _chamfered_square_loop(
                size_mm * level["size_ratio"],
                level["chamfer_ratio"],
            ),
        )
        for level in selected_levels
    )
    return _build_ring_mesh(PRINCESS_CULET_DEPTH_MM, rings)


def build_round_brilliant_mesh(
    diameter_mm,
    levels=None,
    segment_count=ROUND_SYMMETRY_COUNT,
):
    if diameter_mm <= 0.0:
        raise ValueError("round brilliant diameter must be positive")
    if segment_count < TRIANGLE_VERTEX_COUNT:
        raise ValueError("round brilliant requires at least three segments")
    if levels is not None:
        raise ValueError("custom levels are not supported for round brilliants")

    girdle_point_count = segment_count * ROUND_GIRDLE_POINT_FACTOR
    sector_angle = FULL_REVOLUTION_RADIANS / segment_count
    half_sector_angle = sector_angle / HALF_DIVISOR
    girdle_radius_mm = diameter_mm / HALF_DIVISOR
    half_girdle_height_mm = (
        diameter_mm * ROUND_GIRDLE_THICKNESS_RATIO / HALF_DIVISOR
    )
    upper_girdle_height_mm = half_girdle_height_mm
    lower_girdle_height_mm = -half_girdle_height_mm
    table_radius_mm = (
        diameter_mm * ROUND_TABLE_DIAMETER_RATIO / HALF_DIVISOR
    )
    table_height_mm = (
        upper_girdle_height_mm
        + diameter_mm * ROUND_CROWN_HEIGHT_RATIO
    )
    culet_height_mm = (
        lower_girdle_height_mm
        - diameter_mm * ROUND_PAVILION_DEPTH_RATIO
    )
    star_radius_mm = table_radius_mm + (
        girdle_radius_mm - table_radius_mm
    ) * ROUND_STAR_LENGTH_RATIO
    crown_slope = (
        upper_girdle_height_mm - table_height_mm
    ) / (girdle_radius_mm - table_radius_mm)
    star_height_mm = table_height_mm + crown_slope * (
        star_radius_mm * math.cos(half_sector_angle) - table_radius_mm
    )
    pavilion_radius_mm = girdle_radius_mm * (
        1.0 - ROUND_LOWER_GIRDLE_LENGTH_RATIO
    )
    pavilion_slope = (
        lower_girdle_height_mm - culet_height_mm
    ) / girdle_radius_mm
    pavilion_height_mm = culet_height_mm + pavilion_slope * (
        pavilion_radius_mm * math.cos(half_sector_angle)
    )

    vertices = []
    upper_girdle = _append_polar_loop(
        vertices,
        girdle_radius_mm,
        upper_girdle_height_mm,
        girdle_point_count,
        ZERO_ROTATION_RADIANS,
    )
    lower_girdle = _append_polar_loop(
        vertices,
        girdle_radius_mm,
        lower_girdle_height_mm,
        girdle_point_count,
        ZERO_ROTATION_RADIANS,
    )
    table = _append_polar_loop(
        vertices,
        table_radius_mm,
        table_height_mm,
        segment_count,
        ZERO_ROTATION_RADIANS,
    )
    stars = _append_polar_loop(
        vertices,
        star_radius_mm,
        star_height_mm,
        segment_count,
        half_sector_angle,
    )
    pavilion_junctions = _append_polar_loop(
        vertices,
        pavilion_radius_mm,
        pavilion_height_mm,
        segment_count,
        half_sector_angle,
    )
    culet_index = len(vertices)
    vertices.append((0.0, 0.0, culet_height_mm))

    polygon_faces = [tuple(table)]
    for index in range(segment_count):
        next_index = (index + NEXT_INDEX_OFFSET) % segment_count
        previous_index = (index - NEXT_INDEX_OFFSET) % segment_count
        girdle_index = index * ROUND_GIRDLE_POINT_FACTOR
        next_girdle_index = (
            girdle_index + ROUND_GIRDLE_POINT_FACTOR
        ) % girdle_point_count
        half_girdle_index = (
            girdle_index + NEXT_INDEX_OFFSET
        ) % girdle_point_count

        polygon_faces.append((table[index], stars[index], table[next_index]))
        polygon_faces.append(
            (
                table[index],
                stars[previous_index],
                upper_girdle[girdle_index],
                stars[index],
            )
        )
        polygon_faces.append(
            (
                stars[index],
                upper_girdle[girdle_index],
                upper_girdle[half_girdle_index],
            )
        )
        polygon_faces.append(
            (
                stars[index],
                upper_girdle[half_girdle_index],
                upper_girdle[next_girdle_index],
            )
        )
        polygon_faces.append(
            (
                lower_girdle[girdle_index],
                pavilion_junctions[index],
                lower_girdle[half_girdle_index],
            )
        )
        polygon_faces.append(
            (
                lower_girdle[half_girdle_index],
                pavilion_junctions[index],
                lower_girdle[next_girdle_index],
            )
        )
        polygon_faces.append(
            (
                lower_girdle[girdle_index],
                pavilion_junctions[previous_index],
                culet_index,
                pavilion_junctions[index],
            )
        )

    for index in range(girdle_point_count):
        next_index = (index + NEXT_INDEX_OFFSET) % girdle_point_count
        polygon_faces.append(
            (
                upper_girdle[index],
                lower_girdle[index],
                lower_girdle[next_index],
                upper_girdle[next_index],
            )
        )

    triangles = tuple(
        triangle
        for face in polygon_faces
        for triangle in _triangulate_polygon(face)
    )
    return MeshData(tuple(vertices), triangles)


def edge_use_counts(mesh):
    counts = Counter()
    for triangle in mesh.triangles:
        if len(triangle) != TRIANGLE_VERTEX_COUNT:
            raise ValueError("mesh faces must be triangles")
        for index in range(TRIANGLE_VERTEX_COUNT):
            edge = tuple(
                sorted(
                    (
                        triangle[index],
                        triangle[(index + NEXT_INDEX_OFFSET) % TRIANGLE_VERTEX_COUNT],
                    )
                )
            )
            counts[edge] += NEXT_INDEX_OFFSET
    return counts
