DEFAULT_WIDTH_MM = 40.0
DEFAULT_DEPTH_MM = 30.0
DEFAULT_HEIGHT_MM = 10.0
MIN_EXCLUSIVE_DIMENSION_MM = 0.0
HALF_DIVISOR = 2.0
ORIGIN_COORDINATE = 0.0
FIRST_ITEM_INDEX = 0
MILLIMETERS = "mm"
CENTIMETERS = "cm"
DESIGN_PRODUCT_TYPE = "DesignProductType"
BODY_NAME = "Fusion Bridge Smoke Box"


def box_dimensions(parameters):
    defaults = {
        "width_mm": DEFAULT_WIDTH_MM,
        "depth_mm": DEFAULT_DEPTH_MM,
        "height_mm": DEFAULT_HEIGHT_MM,
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
    return dimensions


def run(context):
    import adsk.core
    import adsk.fusion

    dimensions = box_dimensions(context.request.parameters)
    product = context.document.products.itemByProductType(
        DESIGN_PRODUCT_TYPE
    )
    design = adsk.fusion.Design.cast(product)
    if design is None:
        raise RuntimeError("target document is not a Fusion design")

    root_component = design.rootComponent
    sketch = root_component.sketches.add(
        root_component.xYConstructionPlane
    )
    width_cm = design.unitsManager.evaluateExpression(
        f"{dimensions['width_mm']} {MILLIMETERS}",
        CENTIMETERS,
    )
    depth_cm = design.unitsManager.evaluateExpression(
        f"{dimensions['depth_mm']} {MILLIMETERS}",
        CENTIMETERS,
    )
    center = adsk.core.Point3D.create(
        ORIGIN_COORDINATE,
        ORIGIN_COORDINATE,
        ORIGIN_COORDINATE,
    )
    corner = adsk.core.Point3D.create(
        width_cm / HALF_DIVISOR,
        depth_cm / HALF_DIVISOR,
        ORIGIN_COORDINATE,
    )
    sketch.sketchCurves.sketchLines.addCenterPointRectangle(center, corner)

    profile = sketch.profiles.item(FIRST_ITEM_INDEX)
    distance = adsk.core.ValueInput.createByString(
        f"{dimensions['height_mm']} {MILLIMETERS}"
    )
    extrusion = root_component.features.extrudeFeatures.addSimple(
        profile,
        distance,
        adsk.fusion.FeatureOperations.NewBodyFeatureOperation,
    )
    body = extrusion.bodies.item(FIRST_ITEM_INDEX)
    body.name = BODY_NAME
    return {
        **dimensions,
        "body_count": root_component.bRepBodies.count,
        "body_name": body.name,
    }
