import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { Box3, Matrix4, Quaternion, Vector3 } from "three";
import { MECHITZA_MODEL_RELEASE } from "./modelRelease.ts";
import { getMechitzaBaseAssets, MECHITZA_DEFAULT_FINISH, MECHITZA_MODELS } from "./models.ts";

const METERS_PER_INCH = 0.0254;
const POSITION_TOLERANCE_METERS = 0.001;

function meshBounds(model) {
  const bounds = new Box3();
  function visit(index, parent) {
    const node = model.nodes[index];
    const local = node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(
      new Vector3().fromArray(node.translation ?? [0, 0, 0]),
      new Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]),
      new Vector3().fromArray(node.scale ?? [1, 1, 1]),
    );
    const world = parent.clone().multiply(local);
    if (node.mesh !== undefined) {
      for (const primitive of model.meshes[node.mesh].primitives) {
        const { min, max } = model.accessors[primitive.attributes.POSITION];
        const localBounds = new Box3(new Vector3().fromArray(min), new Vector3().fromArray(max));
        bounds.union(localBounds.applyMatrix4(world));
      }
    }
    for (const child of node.children ?? []) visit(child, world);
  }
  for (const node of model.scenes[model.scene ?? 0].nodes) visit(node, new Matrix4());
  return bounds;
}

test("the shared 3D models match the verified Fusion revision and dimensions", async () => {
  const { id, sourceSha256, depthInches, heightInches } = MECHITZA_MODEL_RELEASE;
  for (const { id: arrangement, count, widthInches } of MECHITZA_MODELS) {
    const url = new URL(getMechitzaBaseAssets(arrangement, MECHITZA_DEFAULT_FINISH.id).glb, "https://example.com");
    assert.equal(url.searchParams.get("v"), id);
    const bytes = await readFile(new URL(`../../../public${url.pathname}`, import.meta.url));
    assert.equal(bytes.toString("ascii", 0, 4), "glTF");
    const model = JSON.parse(bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)));
    const provenance = model.asset.extras;
    assert.equal(provenance?.everwoodModelRevision, id, url.pathname);
    assert.equal(provenance.everwoodSourceArchiveSha256, sourceSha256, url.pathname);
    assert.equal(provenance.everwoodUnits, count, url.pathname);
    const bounds = meshBounds(model);
    const actual = bounds.getSize(new Vector3()).toArray();
    const expected = [widthInches, heightInches, depthInches];
    for (const [axis, inches] of expected.entries()) {
      assert.ok(
        Math.abs(actual[axis] - inches * METERS_PER_INCH) < POSITION_TOLERANCE_METERS,
        `${url.pathname} axis ${axis} measured ${actual[axis] / METERS_PER_INCH} in, expected ${inches} in`,
      );
    }
    assert.ok(Math.abs(bounds.min.y) < POSITION_TOLERANCE_METERS, `${url.pathname} ground height`);
  }
});
