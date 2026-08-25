import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve as resolvePath } from "node:path";
import test from "node:test";
import { FUSION_APPEARANCE_SCRIPT } from "./fusionAppearanceScript.ts";

const PYTHON_EXECUTABLE = "python3";
const UTF8_ENCODING = "utf8";
const EXPECTED_APPLIED_BODY_COUNT = 1;
const EXPECTED_CURRENT_APPEARANCE_CALL_COUNT = 1;
const EXPECTED_LEGACY_APPEARANCE_CALL_COUNT = 0;
const COMPONENT_NAME = "Backboard";
const TEXTURE_FILENAME = "textures/backboard.png";
const EXPORTED_AT_ISO = "2026-07-30T16:00:00.000Z";

const FUSION_API_FIXTURE = String.raw`
import importlib.util
import json
import sys
import types
from pathlib import Path

result = {
    "addCalls": 0,
    "addByCopyCalls": 0,
    "appliedBodies": 0,
    "deletedAppearances": 0,
    "flatTextureAttempts": 0,
    "messages": [],
    "texturePaths": [],
}


class Collection:
    def __init__(self, items):
        self._items = items
        self.count = len(items)

    def item(self, index):
        return self._items[index]


class FlatTexture:
    def changeTextureImage(self, image_path):
        result["flatTextureAttempts"] += 1
        return False


class ColorProperty:
    def __init__(self):
        self.isReadOnly = False
        self._connected_texture = None

    @property
    def hasConnectedTexture(self):
        return self._connected_texture is not None

    @hasConnectedTexture.setter
    def hasConnectedTexture(self, enabled):
        self._connected_texture = FlatTexture() if enabled else None

    @property
    def connectedTexture(self):
        return self._connected_texture


class ColorPropertyApi:
    @staticmethod
    def cast(candidate):
        return candidate if isinstance(candidate, ColorProperty) else None


class FlatAppearance:
    def __init__(self, name):
        self.name = name
        self.appearanceProperties = Collection([ColorProperty()])
        self.isUsed = False

    def deleteMe(self):
        result["deletedAppearances"] += 1


class TextureAppearance:
    def __init__(self, name):
        self.name = name
        self._texture_path = ""
        self.isUsed = False

    @property
    def colorTexture(self):
        return self._texture_path

    @colorTexture.setter
    def colorTexture(self, image_path):
        resolved_path = Path(image_path).resolve()
        if not resolved_path.is_file():
            raise RuntimeError("Texture path does not exist")
        self._texture_path = str(resolved_path)
        result["texturePaths"].append(self._texture_path)

    def deleteMe(self):
        result["deletedAppearances"] += 1


class Appearances:
    def __init__(self):
        self._items = {}

    def itemByName(self, name):
        return self._items.get(name)

    def addByCopy(self, source, name):
        result["addByCopyCalls"] += 1
        appearance = FlatAppearance(name)
        self._items[name] = appearance
        return appearance

    def add(self, name):
        result["addCalls"] += 1
        appearance = TextureAppearance(name)
        self._items[name] = appearance
        return appearance


class Body:
    def __init__(self):
        self._appearance = FlatAppearance("Imported STEP color")

    @property
    def appearance(self):
        return self._appearance

    @appearance.setter
    def appearance(self, appearance):
        self._appearance = appearance
        appearance.isUsed = True
        result["appliedBodies"] += 1


class Occurrence:
    def __init__(self, component):
        self.component = component


class Component:
    def __init__(self, name, token, bodies=None, children=None):
        self.name = name
        self.entityToken = token
        self.bRepBodies = Collection(bodies or [])
        self.occurrences = Collection(
            [Occurrence(child) for child in (children or [])]
        )


body = Body()
backboard = Component("Backboard", "backboard", [body])
root_component = Component("Root", "root", children=[backboard])


class Design:
    def __init__(self):
        self.appearances = Appearances()
        self.rootComponent = root_component


class DesignApi:
    @staticmethod
    def cast(product):
        return product


class UserInterface:
    def messageBox(self, message, title):
        result["messages"].append({"message": message, "title": title})


design = Design()


class ApplicationInstance:
    def __init__(self):
        self.activeProduct = design
        self.userInterface = UserInterface()


application_instance = ApplicationInstance()


class ApplicationApi:
    @staticmethod
    def get():
        return application_instance


adsk_module = types.ModuleType("adsk")
core_module = types.ModuleType("adsk.core")
fusion_module = types.ModuleType("adsk.fusion")
core_module.Application = ApplicationApi
core_module.ColorProperty = ColorPropertyApi
fusion_module.Design = DesignApi
adsk_module.core = core_module
adsk_module.fusion = fusion_module
sys.modules["adsk"] = adsk_module
sys.modules["adsk.core"] = core_module
sys.modules["adsk.fusion"] = fusion_module

script_path = Path(sys.argv[1])
spec = importlib.util.spec_from_file_location(
    "EverwoodAppearance",
    script_path,
)
script = importlib.util.module_from_spec(spec)
spec.loader.exec_module(script)
script.run(None)

print(json.dumps(result))
`;

test(
  "creates a texture-capable appearance when an imported STEP appearance rejects image textures",
  async () => {
    const temporaryDirectory = await mkdtemp(
      join(tmpdir(), "everwood-fusion-appearance-"),
    );
    const scriptPath = join(temporaryDirectory, "EverwoodAppearance.py");
    const runnerPath = join(temporaryDirectory, "fusion_api_fixture.py");
    const manifestPath = join(temporaryDirectory, "design-manifest.json");
    const texturePath = join(temporaryDirectory, TEXTURE_FILENAME);

    try {
      await mkdir(join(temporaryDirectory, "textures"));
      await Promise.all([
        writeFile(scriptPath, FUSION_APPEARANCE_SCRIPT, UTF8_ENCODING),
        writeFile(runnerPath, FUSION_API_FIXTURE, UTF8_ENCODING),
        writeFile(
          manifestPath,
          JSON.stringify({
            exportedAtIso: EXPORTED_AT_ISO,
            backboard: {
              componentName: COMPONENT_NAME,
              textureFilename: TEXTURE_FILENAME,
            },
            squares: [],
          }),
          UTF8_ENCODING,
        ),
        writeFile(texturePath, "texture", UTF8_ENCODING),
      ]);

      const output = execFileSync(
        PYTHON_EXECUTABLE,
        [runnerPath, scriptPath],
        { encoding: UTF8_ENCODING },
      );
      const result = JSON.parse(output.trim());

      assert.equal(result.appliedBodies, EXPECTED_APPLIED_BODY_COUNT);
      assert.equal(
        result.addCalls,
        EXPECTED_CURRENT_APPEARANCE_CALL_COUNT,
      );
      assert.equal(
        result.addByCopyCalls,
        EXPECTED_LEGACY_APPEARANCE_CALL_COUNT,
      );
      assert.deepEqual(result.texturePaths, [
        await realpath(resolvePath(texturePath)),
      ]);
      assert.match(
        result.messages.at(-1)?.message ?? "",
        /applied everwood wood appearances to 1 bodies/i,
      );
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  },
);
