import { Box3, Vector3, type Object3D } from "three";

const CROWN_CLEARANCE_METERS = 0.06;
const FIGURES = [
  { name: "Mei", text: "5′1″" },
  { name: "Amara", text: "5′10″" },
];

export type HeightLabel = {
  name: string;
  text: string;
  position: Vector3;
};

export function prepareHeightLabels(scene: Object3D): HeightLabel[] {
  const hairByName = new Map<string, Object3D>();
  scene.traverse((object) => {
    // GLTFLoader retains the source name here even if it sanitizes Object3D.name.
    const name = object.userData.name;
    if (typeof name !== "string") return;
    if (name.endsWith(" · hair")) hairByName.set(name, object);
    if (/^(Mei|Amara) · .* (plaque|lettering) · (Artwork|Glass) side$/.test(name)) {
      object.visible = false;
    }
  });
  scene.updateMatrixWorld(true);

  return FIGURES.flatMap(({ name, text }) => {
    const hair = hairByName.get(`${name} · hair`);
    if (!hair) return [];
    const head = new Box3().setFromObject(hair, true);
    if (head.isEmpty()) return [];

    const position = head.getCenter(new Vector3());
    position.y = head.max.y + CROWN_CLEARANCE_METERS;
    return [{ name, text, position }];
  });
}
