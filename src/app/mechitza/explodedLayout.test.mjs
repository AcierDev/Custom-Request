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
      assert.ok(identifyAssemblyPart(node.name, node.extras?.mechitzaPart), node.name);
    }
  });
}

test("the exploded layers keep the selected material, reunite, and leave unrelated meshes still", () => {
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
  assert.ok(nodes[5].position.equals(origins[5]), "untagged mesh must stay at its natural position");
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

test("staggering keeps the film and cover ahead of the layers they peel away from", async () => {
  const { partExplosionProgress } = await import("./explodedLayout.ts");
  for (const progress of [0, 0.1, 0.2, 0.45, 0.75, 1]) {
    assert.ok(partExplosionProgress("film", progress) >= partExplosionProgress("glass", progress));
    assert.ok(partExplosionProgress("cover", progress) >= partExplosionProgress("art", progress));
  }
  assert.equal(partExplosionProgress("casters", 0.2), 0);
  assert.equal(partExplosionProgress("casters", 1), 1);
});

test("the exploded charcoal guide targets only the original reverse film mesh", async () => {
  const { MeshStandardMaterial } = await import("three");
  const { isFilmReverse } = await import("./explodedLayout.ts");
  const printed = new MeshStandardMaterial();
  printed.name = "Linen Marquetry printed face";
  const reverse = new MeshStandardMaterial({ transparent: true, opacity: 0.34 });
  reverse.name = "Linen Marquetry charcoal reverse";
  assert.equal(isFilmReverse(new Mesh(new BoxGeometry(), printed)), false);
  assert.equal(isFilmReverse(new Mesh(new BoxGeometry(), reverse)), true);
  assert.equal(isFilmReverse(new Mesh(new BoxGeometry(), [printed, reverse])), false);
  assert.equal(reverse.opacity, 0.34);
});


test("exported part and unit tags keep a detailed CAD assembly moving together", () => {
  const scene = new Group();
  const glass = new Mesh(new BoxGeometry(0.5, 0.5, 0.01), new MeshBasicMaterial());
  glass.name = "Upper tempered panel";
  glass.userData.mechitzaPart = "glass";
  glass.userData.mechitzaUnit = "right";
  scene.add(glass);
  const plan = getExplosionPlan(scene);
  assert.equal(plan.parts.length, 1);
  assert.equal(plan.callouts[0].label, "Tempered glass");
  applyExplosion(plan, 1);
  assert.ok(glass.position.x > 0 && glass.position.z < 0);
});


test("the two exported women move two feet toward the artwork side while exploded and return", () => {
  const path = new URL("../../../public/mechitza-figures/mechitza-women.glb", import.meta.url);
  const bytes = readFileSync(path);
  const document = JSON.parse(bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)));
  const scene = new Group();
  // GLTFLoader stores the unsanitized source name in userData.
  const figures = document.scenes[0].nodes
    .map((index) => document.nodes[index])
    .filter(({ children }) => children?.length > 0)
    .map(({ name, translation }) => {
      const figure = new Group();
      figure.name = name.replaceAll(" ", "_");
      figure.userData.name = name;
      figure.position.fromArray(translation);
      figure.add(new Mesh(new BoxGeometry(0.4, 1.6, 0.3), new MeshBasicMaterial()));
      scene.add(figure);
      return figure;
    });
  assert.equal(figures.length, 2);

  const origins = figures.map((figure) => figure.position.clone());
  const plan = getExplosionPlan(scene);
  assert.equal(plan.figures.length, 2);
  applyExplosion(plan, 1);
  for (const [index, figure] of figures.entries()) {
    assert.ok(figure.position.distanceTo(origins[index].clone().add(new Vector3(0, 0, 0.6096))) < 1e-8);
    assert.ok(figure.children[0].position.length() < 1e-8, "children move with the figure only once");
  }
  assert.ok(Math.abs(plan.explodedBounds.max.z - plan.assembledBounds.max.z - 0.6096) < 1e-8);
  applyExplosion(plan, 0);
  assert.ok(figures.every((figure, index) => figure.position.equals(origins[index])));
});
