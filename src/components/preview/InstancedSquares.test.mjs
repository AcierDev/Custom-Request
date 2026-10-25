import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { dirname, extname, resolve as resolvePath } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as THREE from "three";

const require = createRequire(import.meta.url);
const { transformSync } = require("next/dist/build/swc");
const TEST_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolvePath(TEST_DIRECTORY, "..", "..", "..");
const PROJECT_FILE_EXTENSIONS = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  "/index.ts",
  "/index.tsx",
  "/index.js",
];
const TYPESCRIPT_EXTENSIONS = new Set([".ts", ".tsx"]);
const INSTANCE_COUNT = 1;
const FIXTURE_PLANE_SIZE = 1;
const BUFFER_ITEM_SIZE = 1;
const EXPECTED_UPDATE_COUNT = 1;

const resolveProjectFile = (basePath) =>
  PROJECT_FILE_EXTENSIONS.map((suffix) => `${basePath}${suffix}`).find(
    (candidate) => existsSync(candidate),
  );

registerHooks({
  resolve(specifier, context, nextResolve) {
    let basePath;
    if (specifier.startsWith("@/")) {
      basePath = resolvePath(PROJECT_ROOT, "src", specifier.slice(2));
    } else if (
      specifier.startsWith(".") &&
      context.parentURL?.startsWith("file:")
    ) {
      basePath = resolvePath(
        dirname(fileURLToPath(context.parentURL)),
        specifier,
      );
    }

    const projectFile = basePath ? resolveProjectFile(basePath) : undefined;
    return projectFile
      ? {
          url: pathToFileURL(projectFile).href,
          shortCircuit: true,
        }
      : nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    const filename = url.startsWith("file:") ? fileURLToPath(url) : "";
    if (!TYPESCRIPT_EXTENSIONS.has(extname(filename))) {
      return nextLoad(url, context);
    }

    const result = transformSync(readFileSync(filename, "utf8"), {
      filename,
      jsc: {
        parser: {
          syntax: "typescript",
          tsx: filename.endsWith(".tsx"),
        },
        transform: { react: { runtime: "automatic" } },
        target: "es2022",
      },
      module: { type: "es6" },
      sourceMaps: false,
    });
    return {
      format: "module",
      source: result.code,
      shortCircuit: true,
    };
  },
});

let commitInstancedSquareBuffers;
let moduleLoadError;
try {
  ({ commitInstancedSquareBuffers } = await import(
    "./instancedSquareBuffers.ts"
  ));
} catch (error) {
  moduleLoadError = error;
}

test("committing imperatively populated square buffers requests a demand frame", () => {
  assert.ifError(moduleLoadError);
  assert.equal(typeof commitInstancedSquareBuffers, "function");

  const geometry = new THREE.PlaneGeometry(
    FIXTURE_PLANE_SIZE,
    FIXTURE_PLANE_SIZE,
  );
  const material = new THREE.MeshBasicMaterial();
  const mesh = new THREE.InstancedMesh(geometry, material, INSTANCE_COUNT);
  const pickMesh = new THREE.InstancedMesh(
    geometry,
    material,
    INSTANCE_COUNT,
  );
  const grainIndexAttribute = new THREE.InstancedBufferAttribute(
    new Float32Array(INSTANCE_COUNT),
    BUFFER_ITEM_SIZE,
  );
  const initialVersions = {
    mesh: mesh.instanceMatrix.version,
    pickMesh: pickMesh.instanceMatrix.version,
    grain: grainIndexAttribute.version,
  };
  let requestedFrames = 0;

  commitInstancedSquareBuffers({
    mesh,
    pickMesh,
    grainIndexAttribute,
    invalidate: () => {
      requestedFrames += 1;
    },
  });

  assert.equal(
    mesh.instanceMatrix.version,
    initialVersions.mesh + EXPECTED_UPDATE_COUNT,
  );
  assert.equal(
    pickMesh.instanceMatrix.version,
    initialVersions.pickMesh + EXPECTED_UPDATE_COUNT,
  );
  assert.equal(
    grainIndexAttribute.version,
    initialVersions.grain + EXPECTED_UPDATE_COUNT,
  );
  assert.ok(mesh.boundingSphere);
  assert.ok(pickMesh.boundingSphere);
  assert.equal(requestedFrames, EXPECTED_UPDATE_COUNT);

  geometry.dispose();
  material.dispose();
});
