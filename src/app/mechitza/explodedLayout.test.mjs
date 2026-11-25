import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from "three";

const {
  applyExplosion,
  getExplosionPlan,
  identifyAssemblyPart,
} = await import("./explodedLayout.ts");

for (const arrangement of ["one", "three"]) {
  test(`explosion identifies every actual ${arrangement}-unit part`, () => {
    const path = new URL(`../../../public/mechitza-assets/v10-linen-marquetry-${arrangement}.glb`, import.meta.url);
    const bytes = readFileSync(path);
    const jsonLength = bytes.readUInt32LE(12);
    const { nodes } = JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength));
    const parts = nodes.filter((node) => node.mesh !== undefined);
    for (const node of parts) {
      assert.ok(identifyAssemblyPart(node.name.replaceAll(" ", "_")), node.name);
    }
  });
}

test("the exploded layers keep the selected material, reunite, and leave the people still", () => {
  const root = new Group();
  const material = new MeshBasicMaterial({ color: "#cc9552" });
  const nodes = ["Right_Wood", "Right_Cover_glass", "Right_Navy_Everwood_relief", "Right_Linen_Marquetry_print", "Right_Linen_Marquetry_reverse", "Amara_opaque_skirt"]
    .map((name, index) => {
      const mesh = new Mesh(new BoxGeometry(0.8, 0.5, 0.01), material);
      mesh.name = name;
      mesh.position.set(1.68, index, -0.02);
      root.add(mesh);
      return mesh;
    });
  const origins = nodes.map((node) => node.position.clone());
  const plan = getExplosionPlan(root);
  assert.equal(plan.parts.length, 5);
  applyExplosion(plan, 1);
  assert.ok(nodes[1].position.z > nodes[2].position.z, "cover remains on the artwork-facing side of the relief");
  assert.ok(nodes[1].position.z > origins[1].z && nodes[2].position.z > origins[2].z);
  const frontMotion = nodes[3].position.clone().sub(origins[3]);
  const reverseMotion = nodes[4].position.clone().sub(origins[4]);
  assert.ok(frontMotion.distanceTo(reverseMotion) < 1e-8);
  assert.ok(nodes[5].position.equals(origins[5]), "reference figure must stay at its natural position");
  assert.ok(nodes.every((mesh) => mesh.material === material));
  assert.ok(plan.explodedBounds.min.z < plan.assembledBounds.min.z);
  applyExplosion(plan, 0);
  assert.ok(nodes.every((node, index) => node.position.equals(origins[index])));
});

test("offsets stay in the world layer direction under a rotated asset root", () => {
  const scene = new Group();
  const root = new Group();
  root.rotation.y = Math.PI / 2;
  scene.add(root);
  const glass = new Mesh(new BoxGeometry(1, 1, 0.01), new MeshBasicMaterial());
  glass.name = "Glass";
  root.add(glass);
  const initial = glass.getWorldPosition(new Vector3());
  const plan = getExplosionPlan(scene);
  applyExplosion(plan, 1);
  const displaced = glass.getWorldPosition(new Vector3()).sub(initial);
  assert.ok(displaced.z < 0 && Math.abs(displaced.x) < 1e-8 && displaced.y > 0);
});
