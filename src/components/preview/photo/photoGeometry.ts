import * as THREE from "three";
import { PHOTO_DETAIL_CONFIG as D, PHOTO_MATH as M } from "./photoConfig.ts";

type Pair = readonly [number, number];
type Triple = readonly [number, number, number];

/** Project each box face in metres. Rounded vertices keep their face's plane
 * so a changing bevel normal cannot jump between unrelated texture axes. */
export function applyPhotoBoxUvs(geometry: THREE.BufferGeometry, size: Triple, tile: Pair, phase: Pair = [M.zero, M.zero]) {
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const uv = geometry.getAttribute("uv");
  const axes = [M.zero, M.one, M.two];
  const indices = geometry.getIndex();
  const groups = geometry.groups.length ? geometry.groups : [{ start: M.zero, count: indices?.count ?? positions.count }];
  for (const group of groups) {
    const vertices = new Set<number>();
    const normal: number[] = [M.zero, M.zero, M.zero];
    for (let offset = group.start; offset < group.start + group.count; offset += M.one) {
      const vertex = indices ? indices.getX(offset) : offset;
      vertices.add(vertex);
      normal[M.zero] += normals.getX(vertex);
      normal[M.one] += normals.getY(vertex);
      normal[M.two] += normals.getZ(vertex);
    }
    const face = axes.reduce((best, axis) => Math.abs(normal[axis]) > Math.abs(normal[best]) ? axis : best);
    const [long, across] = axes.filter((axis) => axis !== face).sort((a, b) => size[b] - size[a]);
    for (const vertex of vertices) {
      const point = [positions.getX(vertex), positions.getY(vertex), positions.getZ(vertex)];
      uv.setXY(vertex, point[long] / tile[M.zero] + phase[M.zero], point[across] / tile[M.one] + phase[M.one]);
    }
  }
  uv.needsUpdate = true;
}

export function createPhotoLeafGeometry(length: number, width: number) {
  const positions: number[] = [];
  const uv: number[] = [];
  const indices: number[] = [];
  const columns = D.leafWidthSegments + M.one;
  for (let row = M.zero; row <= D.leafSegments; row += M.one) {
    const t = row / D.leafSegments;
    const silhouette = Math.sin(t * Math.PI);
    for (let column = M.zero; column <= D.leafWidthSegments; column += M.one) {
      const s = column / D.leafWidthSegments;
      const across = s * M.two - M.one;
      const fold = (M.one - Math.abs(across)) * D.leafMidribLift;
      const ripple = Math.sin(t * M.fullTurn * D.leafEdgeFrequency + across * Math.PI) * D.leafEdgeWave * Math.abs(across);
      positions.push(across * silhouette * width, t * length,
        silhouette * (fold + ripple) - t * t * D.leafCurl);
      uv.push(s, t);
      if (row < D.leafSegments && column < D.leafWidthSegments) {
        const first = row * columns + column;
        indices.push(first, first + columns, first + M.one,
          first + M.one, first + columns, first + columns + M.one);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, M.three));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, M.two));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Tiny compression and fabric folds catch grazing light without changing the frame. */
export function softenPhotoSeat(geometry: THREE.BufferGeometry, size: Triple) {
  const positions = geometry.getAttribute("position");
  const halfX = size[M.zero] * M.half, halfZ = size[M.two] * M.half;
  for (let vertex = M.zero; vertex < positions.count; vertex += M.one) {
    const x = positions.getX(vertex), y = positions.getY(vertex), z = positions.getZ(vertex);
    if (y <= M.zero) continue;
    const envelope = Math.max(M.zero, M.one - (x / halfX) ** M.two) * Math.max(M.zero, M.one - (z / halfZ) ** M.two);
    const wrinkle = Math.sin(x / halfX * D.clothWrinkleFrequency) * D.clothWrinkleDepth;
    positions.setY(vertex, y - envelope * D.seatCompression + envelope * wrinkle);
  }
  geometry.computeVertexNormals();
}
