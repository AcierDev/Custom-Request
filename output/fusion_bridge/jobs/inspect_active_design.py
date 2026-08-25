DESIGN_PRODUCT_TYPE = "DesignProductType"


def _bounds_payload(bounds):
    if bounds is None:
        return None
    return {
        "minimum_cm": (
            bounds.minPoint.x,
            bounds.minPoint.y,
            bounds.minPoint.z,
        ),
        "maximum_cm": (
            bounds.maxPoint.x,
            bounds.maxPoint.y,
            bounds.maxPoint.z,
        ),
    }


def run(context):
    import adsk.fusion

    design = adsk.fusion.Design.cast(
        context.document.products.itemByProductType(DESIGN_PRODUCT_TYPE)
    )
    if design is None:
        raise RuntimeError("active document is not a Fusion design")
    root_component = design.rootComponent
    return {
        "document_name": context.document.name,
        "component_name": root_component.name,
        "brep_bodies": [
            {
                "name": body.name,
                "object_type": body.objectType,
                "bounds": _bounds_payload(body.boundingBox),
            }
            for body in root_component.bRepBodies
        ],
        "mesh_bodies": [
            {
                "name": body.name,
                "object_type": body.objectType,
                "bounds": _bounds_payload(body.boundingBox),
            }
            for body in root_component.meshBodies
        ],
        "occurrence_count": root_component.occurrences.count,
    }
