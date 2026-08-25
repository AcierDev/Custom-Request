import math


DEFAULT_INSIDE_DIAMETER_MM = 15.9
DEFAULT_BAND_WIDTH_MM = 6.0
DEFAULT_RADIAL_THICKNESS_MM = 2.0
DEFAULT_EDGE_RADIUS_MM = 0.75
MIN_EXCLUSIVE_DIMENSION_MM = 0.0
HALF_DIVISOR = 2.0
GOLD_TOKEN = "gold"
YELLOW_TOKEN = "yellow"
POLISHED_TOKEN = "polished"
GOLD_BASE_SCORE = 1
POLISHED_BONUS_SCORE = 10
YELLOW_BONUS_SCORE = 20
DIAGONAL_FACTOR = math.sqrt(0.5)
ORIGIN_COORDINATE_MM = 0.0
MILLIMETERS = "mm"
CENTIMETERS = "cm"
DESIGN_PRODUCT_TYPE = "DesignProductType"
FIRST_ITEM_INDEX = 0
FULL_REVOLUTION_RADIANS = math.tau
BODY_NAME = "Size 5.25 Yellow Gold Wedding Band"
APPEARANCE_COPY_SUFFIX = " - Fusion Bridge"


def band_dimensions(parameters):
    defaults = {
        "inside_diameter_mm": DEFAULT_INSIDE_DIAMETER_MM,
        "band_width_mm": DEFAULT_BAND_WIDTH_MM,
        "radial_thickness_mm": DEFAULT_RADIAL_THICKNESS_MM,
        "edge_radius_mm": DEFAULT_EDGE_RADIUS_MM,
    }
    dimensions = {}
    for name, default in defaults.items():
        value = parameters.get(name, default)
        if (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or value <= MIN_EXCLUSIVE_DIMENSION_MM
        ):
            raise ValueError(f"{name} must be a positive number")
        dimensions[name] = float(value)

    maximum_edge_radius = min(
        dimensions["band_width_mm"],
        dimensions["radial_thickness_mm"],
    ) / HALF_DIVISOR
    if dimensions["edge_radius_mm"] >= maximum_edge_radius:
        raise ValueError(
            "edge_radius_mm must be less than half the smaller "
            "cross-section dimension"
        )
    return dimensions


def _gold_appearance_score(name):
    normalized = name.casefold()
    if GOLD_TOKEN not in normalized:
        return None
    score = GOLD_BASE_SCORE
    if POLISHED_TOKEN in normalized:
        score += POLISHED_BONUS_SCORE
    if YELLOW_TOKEN in normalized:
        score += YELLOW_BONUS_SCORE
    return score


def select_gold_appearance_name(names):
    candidates = []
    for name in names:
        score = _gold_appearance_score(name)
        if score is not None:
            candidates.append((score, name.casefold(), name))
    if not candidates:
        return None
    return max(candidates)[2]


def rounded_profile_points(dimensions):
    inner_radius = dimensions["inside_diameter_mm"] / HALF_DIVISOR
    outer_radius = inner_radius + dimensions["radial_thickness_mm"]
    half_width = dimensions["band_width_mm"] / HALF_DIVISOR
    radius = dimensions["edge_radius_mm"]
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


def _find_gold_appearance(app):
    appearances_by_name = {}
    libraries = app.materialLibraries
    for library_index in range(libraries.count):
        appearances = libraries.item(library_index).appearances
        for appearance_index in range(appearances.count):
            appearance = appearances.item(appearance_index)
            appearances_by_name.setdefault(appearance.name, appearance)
    selected_name = select_gold_appearance_name(
        list(appearances_by_name)
    )
    if selected_name is None:
        raise RuntimeError("no gold appearance is installed in Fusion")
    return appearances_by_name[selected_name]


def run(context):
    import adsk.core
    import adsk.fusion

    dimensions = band_dimensions(context.request.parameters)
    design = adsk.fusion.Design.cast(
        context.document.products.itemByProductType(DESIGN_PRODUCT_TYPE)
    )
    if design is None:
        raise RuntimeError("target document is not a Fusion design")

    root_component = design.rootComponent
    sketch = root_component.sketches.add(
        root_component.xYConstructionPlane
    )
    points_mm = rounded_profile_points(dimensions)

    def point(name):
        radial_mm, axial_mm = points_mm[name]
        radial_cm = design.unitsManager.evaluateExpression(
            f"{radial_mm} {MILLIMETERS}",
            CENTIMETERS,
        )
        axial_cm = design.unitsManager.evaluateExpression(
            f"{axial_mm} {MILLIMETERS}",
            CENTIMETERS,
        )
        return adsk.core.Point3D.create(
            radial_cm,
            axial_cm,
            ORIGIN_COORDINATE_MM,
        )

    lines = sketch.sketchCurves.sketchLines
    arcs = sketch.sketchCurves.sketchArcs
    lines.addByTwoPoints(point("top_left"), point("top_right"))
    arcs.addByThreePoints(
        point("top_right"),
        point("top_right_mid"),
        point("right_top"),
    )
    lines.addByTwoPoints(point("right_top"), point("right_bottom"))
    arcs.addByThreePoints(
        point("right_bottom"),
        point("bottom_right_mid"),
        point("bottom_right"),
    )
    lines.addByTwoPoints(point("bottom_right"), point("bottom_left"))
    arcs.addByThreePoints(
        point("bottom_left"),
        point("bottom_left_mid"),
        point("left_bottom"),
    )
    lines.addByTwoPoints(point("left_bottom"), point("left_top"))
    arcs.addByThreePoints(
        point("left_top"),
        point("top_left_mid"),
        point("top_left"),
    )

    axis_extent_mm = dimensions["band_width_mm"]
    axis = lines.addByTwoPoints(
        adsk.core.Point3D.create(
            ORIGIN_COORDINATE_MM,
            -axis_extent_mm,
            ORIGIN_COORDINATE_MM,
        ),
        adsk.core.Point3D.create(
            ORIGIN_COORDINATE_MM,
            axis_extent_mm,
            ORIGIN_COORDINATE_MM,
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
    body.name = BODY_NAME

    source_appearance = _find_gold_appearance(context.app)
    appearance = design.appearances.addByCopy(
        source_appearance,
        source_appearance.name + APPEARANCE_COPY_SUFFIX,
    )
    body.appearance = appearance

    outer_diameter_mm = (
        dimensions["inside_diameter_mm"]
        + dimensions["radial_thickness_mm"] * HALF_DIVISOR
    )
    return {
        **dimensions,
        "outer_diameter_mm": outer_diameter_mm,
        "body_count": root_component.bRepBodies.count,
        "body_name": body.name,
        "appearance_name": appearance.name,
    }
