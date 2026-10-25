import * as THREE from "three";
import { getNormalizedWedgeCorners, WEDGE_FACE_CORNER_INDEXES } from "../../../lib/wedgeGeometry.ts";
import { PHOTO_ART_CONFIG as C, PHOTO_MATH as M } from "./photoConfig.ts";
import { photoWoodVariation } from "./photoWoodFinish.ts";

/** A small edge break catches light without changing the wedge's slope or
 * measured footprint. Broad faces, edge strips and corner caps form a closed solid. */
export function createPhotoWedgeGeometry(grainIndex: number, front: boolean, physicalScale: number, variationIndex: number = M.zero) {
  const variation = photoWoodVariation(variationIndex);
  const corners = getNormalizedWedgeCorners().map(point => new THREE.Vector3(point.x, point.y, point.z));
  const radius = C.edgeBevelMeters / (physicalScale * C.sceneToMeters);
  const facePoints: Map<number, THREE.Vector3>[] = [];
  const faceNormals: THREE.Vector3[] = [];
  const edges = new Map<string, { a: number; b: number; faces: number[] }>();
  const polygons: { points: THREE.Vector3[]; faces: number[] }[] = [];
  WEDGE_FACE_CORNER_INDEXES.forEach((face, faceIndex) => {
    const points = new Map<number, THREE.Vector3>();
    const normal = corners[face[M.one]].clone().sub(corners[face[M.zero]])
      .cross(corners[face[M.two]].clone().sub(corners[face[M.zero]])).normalize();
    face.forEach((cornerIndex, index) => {
      const corner = corners[cornerIndex];
      const previous = corners[face[(index + face.length - M.one) % face.length]].clone().sub(corner).normalize();
      const nextIndex = face[(index + M.one) % face.length];
      const next = corners[nextIndex].clone().sub(corner).normalize();
      const bisector = previous.clone().add(next).normalize();
      const distance = radius / bisector.clone().cross(previous).length();
      points.set(cornerIndex, corner.clone().addScaledVector(bisector, distance));
      const key = [cornerIndex, nextIndex].sort((a, b) => a - b).join(":");
      const edge = edges.get(key) ?? { a: cornerIndex, b: nextIndex, faces: [] };
      edge.faces.push(faceIndex); edges.set(key, edge);
    });
    facePoints.push(points); faceNormals.push(normal);
    polygons.push({ points: [...points.values()], faces: [faceIndex] });
  });
  for (const { a, b, faces } of edges.values()) {
    const [first, second] = faces;
    polygons.push({ points: [facePoints[first].get(a)!, facePoints[first].get(b)!,
      facePoints[second].get(b)!, facePoints[second].get(a)!], faces });
  }
  corners.forEach((_, cornerIndex) => {
    const faces = facePoints.flatMap((points, face) => points.has(cornerIndex) ? [face] : []);
    polygons.push({ points: faces.map(face => facePoints[face].get(cornerIndex)!), faces });
  });
  const positions: number[] = [], uv: number[] = [], indices: number[] = [];
  const backZ = corners[M.zero].z, depthRange = Math.max(...corners.map(corner => corner.z)) - backZ;
  const column = grainIndex % C.atlasGrid, row = Math.floor(grainIndex / C.atlasGrid);
  for (const polygon of polygons) {
    const belongsToFront = polygon.faces.includes(C.frontFace);
    if (belongsToFront !== front) continue;
    const expected = polygon.faces.reduce((sum, face) => sum.add(faceNormals[face]), new THREE.Vector3()).normalize();
    const actual = polygon.points[M.one].clone().sub(polygon.points[M.zero])
      .cross(polygon.points[M.two].clone().sub(polygon.points[M.zero]));
    if (actual.dot(expected) < M.zero) polygon.points.reverse();
    const base = positions.length / M.three;
    for (const point of polygon.points) {
      positions.push(...point.toArray());
      // Every face samples the same board cross-section: the square's width is
      // the board's width and its depth from the wall is the board's thickness.
      // Fibres run along the slope, so the front slice stretches the rings,
      // the thick back edge shows true end grain and the sides show long grain.
      const across = point.x * C.atlasInset + M.half + variation.offset[M.zero];
      const depth = ((point.z - backZ) / depthRange - M.half) * C.atlasInset + M.half + variation.offset[M.one];
      uv.push((column + across) / C.atlasGrid, (row + depth) / C.atlasGrid);
    }
    for (let vertex = M.one; vertex < polygon.points.length - M.one; vertex += M.one)
      indices.push(base, base + vertex, base + vertex + M.one);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, M.three));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, M.two));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
