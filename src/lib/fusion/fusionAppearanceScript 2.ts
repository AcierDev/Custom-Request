import { FUSION_PACKAGE_CONFIG } from "./fusionPackageConfig.ts";

const pythonString = (value: string): string => JSON.stringify(value);

export const FUSION_SCRIPT_MANIFEST = JSON.stringify(
  {
    autodeskProduct: "Fusion360",
    type: "script",
    id: FUSION_PACKAGE_CONFIG.scriptId,
    author: FUSION_PACKAGE_CONFIG.scriptAuthor,
    description: {
      "": FUSION_PACKAGE_CONFIG.scriptDescription,
    },
    version: FUSION_PACKAGE_CONFIG.scriptVersion,
    supportedOS: FUSION_PACKAGE_CONFIG.supportedOperatingSystems,
  },
  null,
  FUSION_PACKAGE_CONFIG.jsonIndentSpaces,
);

export const FUSION_APPEARANCE_SCRIPT = `import adsk.core
import adsk.fusion
import json
import traceback
from pathlib import Path

SCRIPT_DIRECTORY = Path(__file__).resolve().parent
DESIGN_MANIFEST_PATH = SCRIPT_DIRECTORY / ${pythonString(
  FUSION_PACKAGE_CONFIG.designManifestFilename,
)}
APPEARANCE_PREFIX = "Everwood Wood"
INVALID_FILENAME_CHARACTERS = ":.-+TZ"


def load_manifest(path):
    with path.open("r", encoding="utf-8") as manifest_file:
        return json.load(manifest_file)


def collect_components(root_component):
    components = {}
    visited_tokens = set()

    def visit(component):
        token = component.entityToken
        if token in visited_tokens:
            return
        visited_tokens.add(token)
        components.setdefault(component.name, []).append(component)
        occurrences = component.occurrences
        for occurrence_index in range(occurrences.count):
            visit(occurrences.item(occurrence_index).component)

    visit(root_component)
    return components


def find_color_property(appearance):
    properties = appearance.appearanceProperties
    for property_index in range(properties.count):
        candidate = adsk.core.ColorProperty.cast(
            properties.item(property_index)
        )
        if candidate and not candidate.isReadOnly:
            return candidate
    return None


def appearance_name(mapping, exported_at):
    timestamp = exported_at
    for character in INVALID_FILENAME_CHARACTERS:
        timestamp = timestamp.replace(character, "")
    return "{} {} {}".format(
        APPEARANCE_PREFIX,
        mapping["componentName"],
        timestamp,
    )


def attach_current_texture(appearance, texture_path):
    try:
        appearance.colorTexture = str(texture_path)
        return bool(appearance.colorTexture)
    except Exception:
        return False


def delete_unused_appearance(appearance):
    try:
        if appearance and not appearance.isUsed:
            appearance.deleteMe()
    except Exception:
        pass


def ensure_textured_appearance(design, body, mapping, exported_at):
    texture_path = SCRIPT_DIRECTORY / mapping["textureFilename"]
    if not texture_path.is_file():
        raise RuntimeError("Missing texture: {}".format(texture_path.name))

    name = appearance_name(mapping, exported_at)
    appearance = design.appearances.itemByName(name)
    if appearance:
        if attach_current_texture(appearance, texture_path):
            return appearance
        delete_unused_appearance(appearance)

    add_appearance = getattr(design.appearances, "add", None)
    if callable(add_appearance):
        try:
            appearance = add_appearance(name)
            if appearance and attach_current_texture(
                appearance,
                texture_path,
            ):
                return appearance
            delete_unused_appearance(appearance)
        except Exception:
            appearance = None

    appearance = design.appearances.addByCopy(body.appearance, name)
    if appearance:
        color_property = find_color_property(appearance)
        if color_property:
            color_property.hasConnectedTexture = True
            texture = color_property.connectedTexture
            if texture and texture.changeTextureImage(str(texture_path)):
                return appearance

    delete_unused_appearance(appearance)
    raise RuntimeError(
        "Could not attach texture for {}".format(
            mapping["componentName"]
        )
    )


def apply_mapping(design, components, mapping, exported_at):
    texture_filename = mapping.get("textureFilename")
    if not texture_filename:
        return 0

    matches = components.get(mapping["componentName"], [])
    if not matches:
        raise RuntimeError(
            "Component not found: {}".format(mapping["componentName"])
        )

    applied_count = 0
    appearance = None
    for component in matches:
        bodies = component.bRepBodies
        for body_index in range(bodies.count):
            body = bodies.item(body_index)
            if not appearance:
                appearance = ensure_textured_appearance(
                    design,
                    body,
                    mapping,
                    exported_at,
                )
            body.appearance = appearance
            applied_count += 1
    return applied_count


def run(context):
    ui = None
    try:
        app = adsk.core.Application.get()
        ui = app.userInterface
        design = adsk.fusion.Design.cast(app.activeProduct)
        if not design:
            raise RuntimeError(
                "Open the Everwood STEP file before running this script."
            )

        manifest = load_manifest(DESIGN_MANIFEST_PATH)
        components = collect_components(design.rootComponent)
        mappings = [manifest["backboard"]] + manifest["squares"]
        errors = []
        applied_count = 0

        for mapping in mappings:
            try:
                applied_count += apply_mapping(
                    design,
                    components,
                    mapping,
                    manifest["exportedAtIso"],
                )
            except Exception as error:
                errors.append(str(error))

        if errors:
            ui.messageBox(
                "Applied wood to {} bodies.\\n\\n{}".format(
                    applied_count,
                    "\\n".join(errors),
                ),
                "Everwood Appearance",
            )
        else:
            ui.messageBox(
                "Applied Everwood wood appearances to {} bodies.".format(
                    applied_count
                ),
                "Everwood Appearance",
            )
    except Exception:
        if ui:
            ui.messageBox(
                "Everwood appearance failed:\\n{}".format(
                    traceback.format_exc()
                ),
                "Everwood Appearance",
            )
`;

export const createFusionReadme = (stepFilename: string): string =>
  `Everwood Fusion Package

This package contains an editable, correctly scaled STEP model plus the current
Viewer wood appearances.

1. Unzip this package.
2. In Autodesk Fusion, open or import "${stepFilename}".
3. Open Utilities > Add-Ins > Scripts and Add-Ins.
4. Use the green + button to link the "EverwoodAppearance" folder.
5. Select EverwoodAppearance and click Run.

The script changes appearances only. It does not modify geometry, component
positions, or scale. The STEP model remains usable if an appearance cannot be
applied. Fusion's Texture Map Controls can adjust grain orientation or scale
afterward.
`;
