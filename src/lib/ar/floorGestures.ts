type Contact = {
  x: number;
  y: number;
  drag: [number, number];
};

type FloorControls = {
  startDrag: (x: number, y: number) => void;
  moveDrag: (x: number, y: number) => void;
  endDrag: () => void;
  rotate: (radians: number) => void;
};

const MIN_TWIST_SPAN_PX = 12;

export function createFloorGestures(controls: FloorControls) {
  const contacts = new Map<number, Contact>();
  let angle: number | null = null;

  function twistAngle() {
    const [first, second] = contacts.values();
    const x = second.x - first.x;
    const y = second.y - first.y;
    return Math.hypot(x, y) >= MIN_TWIST_SPAN_PX ? Math.atan2(y, x) : null;
  }

  return {
    down(id: number, contact: Contact) {
      if (contacts.has(id) || contacts.size === 2) return false;
      contacts.set(id, contact);
      if (contacts.size === 1) {
        controls.startDrag(...contact.drag);
      } else {
        controls.endDrag();
        angle = twistAngle();
      }
      return true;
    },

    move(id: number, contact: Contact) {
      if (!contacts.has(id)) return;
      contacts.set(id, contact);
      if (contacts.size === 1) {
        controls.moveDrag(...contact.drag);
        return;
      }

      const previousAngle = angle;
      angle = twistAngle();
      if (angle !== null && previousAngle !== null) {
        const delta = previousAngle - angle;
        if (delta !== 0) controls.rotate(Math.atan2(Math.sin(delta), Math.cos(delta)));
      }
    },

    up(id: number) {
      if (!contacts.delete(id)) return;
      const remaining = contacts.values().next().value;
      angle = null;
      if (remaining) controls.startDrag(...remaining.drag);
      else controls.endDrag();
    },

    reset() {
      if (contacts.size === 1) controls.endDrag();
      contacts.clear();
      angle = null;
    },
  };
}
