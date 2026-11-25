import { Box3, Matrix3, Matrix4, Vector3, type Mesh, type Object3D } from "three";
import { EXPLODED_PART_LABELS } from "./explodedParts.ts";

const EXPLODED_COMPONENTS = [
  { part: "frame", anchor: [0.025, 0.70, 0.5], leader: [-0.57, 0.30, 0.01] },
  { part: "glass", anchor: [0.07, 0.61, 0.5], leader: [-0.23, 0.19, -0.1] },
  { part: "film", anchor: [0.22, 0.94, 0.5], leader: [-0.16, 0.19, -0.04] },
  { part: "art", anchor: [0.13, 0.46, 0.5], leader: [-0.31, 0.04, 0.04] },
  { part: "cover", anchor: [0.20, 0.62, 0.5], leader: [-0.24, 0.16, -0.03] },
  { part: "casters", anchor: [0.07, 0.45, 0.19], leader: [-0.29, -0.04, -0.03] },
] as const;

type Part = typeof EXPLODED_COMPONENTS[number]["part"] | "gasket" | "ballast";
type Offset = readonly [x: number, y: number, z: number];

// The lower layers stay in front of the frame and stop short of the reference figures.
const PART_OFFSETS: Record<Part, Offset> = {
  frame: [0, 0, 0],
  glass: [0, 0.22, -0.43],
  film: [0, 0.48, -0.88],
  art: [0, 0.07, 0.32],
  cover: [0, 0.29, 0.58],
  casters: [0, -0.19, 0.04],
  gasket: [0, 0.02, -0.16],
  ballast: [0, -0.14, -0.36],
};

const PART_NAMES: Readonly<Record<string, Part>> = {
  wood: "frame",
  glass: "glass",
  "linen marquetry print": "film",
  "linen marquetry reverse": "film",
  "navy everwood relief": "art",
  "cover glass": "cover",
  "caster steel": "casters",
  "nonmarking rubber": "casters",
  "charcoal gasket": "gasket",
  ballast: "ballast",
};

type AssemblyPart = {
  kind: Part;
  node: Object3D;
  origin: Vector3;
  offset: Vector3;
  worldOffset: Vector3;
  bounds: Box3;
};

export type ExplosionCallout = {
  number: string;
  label: string;
  anchor: Vector3;
  leader: Offset;
  offset: Vector3;
};

type ExplosionPlan = {
  assembledBounds: Box3;
  explodedBounds: Box3;
  parts: AssemblyPart[];
  callouts: ExplosionCallout[];
};

const plans = new WeakMap<Object3D, ExplosionPlan>();

function normalizedName(name: string) {
  return name.toLowerCase().replaceAll("_", " ").replace(/\s+/g, " ").trim();
}

export function identifyAssemblyPart(name: string): Part | undefined {
  const partName = normalizedName(name).replace(/^(left|right) /, "");
  if (partName.startsWith("15 ") && partName.includes("gasket")) return "gasket";
  return Object.hasOwn(PART_NAMES, partName) ? PART_NAMES[partName] : undefined;
}

export function getExplosionPlan(scene: Object3D): ExplosionPlan {
  const cached = plans.get(scene);
  if (cached) return cached;

  scene.updateWorldMatrix(true, true);
  const assembledBounds = new Box3().setFromObject(scene);
  const explodedBounds = assembledBounds.clone();
  const parts: AssemblyPart[] = [];
  const inverse = new Matrix4();
  const localAxes = new Matrix3();

  scene.traverse((object) => {
    if (!(object as Mesh).isMesh) return;
    const kind = identifyAssemblyPart(object.name);
    if (!kind) return;

    const framePiece = normalizedName(object.name);
    const worldOffset = new Vector3(...PART_OFFSETS[kind]);
    if (framePiece.startsWith("left ")) worldOffset.x -= 0.18;
    if (framePiece.startsWith("right ")) worldOffset.x += 0.18;

    const origin = object.position.clone();
    const offset = worldOffset.clone();
    if (object.parent) {
      localAxes.setFromMatrix4(inverse.copy(object.parent.matrixWorld).invert());
      offset.applyMatrix3(localAxes);
    }

    const bounds = new Box3().setFromObject(object);
    explodedBounds.union(bounds.clone().translate(worldOffset));
    parts.push({ kind, node: object, origin, offset, worldOffset, bounds });
  });

  const callouts: ExplosionCallout[] = [];
  for (const [index, component] of EXPLODED_COMPONENTS.entries()) {
    const part = parts
      .filter((candidate) => candidate.kind === component.part)
      .sort((left, right) => left.bounds.min.x - right.bounds.min.x)[0];
    if (!part) continue;

    const size = part.bounds.getSize(new Vector3());
    const anchor = part.bounds.min.clone().add(size.multiply(new Vector3(...component.anchor)));
    const tip = anchor.clone().add(part.worldOffset).add(new Vector3(...component.leader));
    explodedBounds.expandByPoint(tip);
    callouts.push({
      number: String(index + 1).padStart(2, "0"),
      label: EXPLODED_PART_LABELS[index],
      anchor,
      leader: component.leader,
      offset: part.worldOffset,
    });
  }

  const plan = { assembledBounds, explodedBounds, parts, callouts };
  plans.set(scene, plan);
  return plan;
}

export function getExplodedBounds(scene: Object3D, exploded: boolean): Box3 {
  const plan = getExplosionPlan(scene);
  return (exploded ? plan.explodedBounds : plan.assembledBounds).clone();
}

export function applyExplosion(plan: ExplosionPlan, amount: number) {
  for (const part of plan.parts) {
    part.node.position.copy(part.origin).addScaledVector(part.offset, amount);
  }
}
