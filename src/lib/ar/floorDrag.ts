import { Plane, Raycaster, Vector2, Vector3, type PerspectiveCamera } from "three";

const MAX_FLOOR_PROJECTION_DISTANCE = 12; // meters, to ignore near-horizon rays

export function createFloorDrag() {
  const raycaster = new Raycaster();
  const cursor = new Vector2();
  const plane = new Plane(new Vector3(0, 1, 0));
  const point = new Vector3();
  const grabOffset = new Vector3();
  let dragging = false;

  function project(camera: PerspectiveCamera, x: number, y: number, floorHeight: number) {
    plane.constant = -floorHeight;
    raycaster.setFromCamera(cursor.set(x, y), camera);
    const hit = raycaster.ray.intersectPlane(plane, point);
    return hit !== null
      && point.distanceToSquared(raycaster.ray.origin) <= MAX_FLOOR_PROJECTION_DISTANCE ** 2;
  }

  return {
    begin(camera: PerspectiveCamera, x: number, y: number, position: Vector3) {
      dragging = project(camera, x, y, position.y);
      if (dragging) grabOffset.subVectors(position, point);
      return dragging;
    },
    move(camera: PerspectiveCamera, x: number, y: number, position: Vector3) {
      if (dragging && project(camera, x, y, position.y)) {
        position.x = point.x + grabOffset.x;
        position.z = point.z + grabOffset.z;
      }
    },
    end() {
      dragging = false;
    },
  };
}
