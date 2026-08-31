import type { InstancedBufferAttribute, InstancedMesh } from "three";

interface CommitInstancedSquareBuffersOptions {
  mesh: InstancedMesh;
  pickMesh: InstancedMesh | null;
  grainIndexAttribute: InstancedBufferAttribute;
  invalidate: () => void;
}

export const commitInstancedSquareBuffers = ({
  mesh,
  pickMesh,
  grainIndexAttribute,
  invalidate,
}: CommitInstancedSquareBuffersOptions): void => {
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  grainIndexAttribute.needsUpdate = true;
  mesh.computeBoundingSphere();

  if (pickMesh) {
    pickMesh.instanceMatrix.needsUpdate = true;
    pickMesh.computeBoundingSphere();
  }

  invalidate();
};
