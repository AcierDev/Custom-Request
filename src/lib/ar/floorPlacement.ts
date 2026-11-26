const MIN_UPWARD_NORMAL = Math.cos(Math.PI / 9);
const FLOOR_HOLD_MS = 1_200;

export function findUpwardHorizontalHit(
  hits: readonly XRHitTestResult[],
  referenceSpace: XRReferenceSpace,
): XRPose | null {
  for (const hit of hits) {
    const pose = hit.getPose(referenceSpace);
    // The hit transform's +Y axis is the surface normal. Its Y component
    // rejects walls and downward-facing surfaces while allowing tracking noise.
    if (pose && pose.transform.matrix[5] >= MIN_UPWARD_NORMAL) return pose;
  }
  return null;
}

/** Bridge short hit-test dropouts, without letting a stale pose place the divider. */
export function createFloorHitTracker() {
  let lastPose: XRPose | null = null;
  let expiresAt = 0;

  function current(now: number): XRPose | null {
    if (now > expiresAt) lastPose = null;
    return lastPose;
  }

  return {
    current,
    update(hits: readonly XRHitTestResult[], space: XRReferenceSpace | null, now: number): XRPose | null {
      const pose = space ? findUpwardHorizontalHit(hits, space) : null;
      if (pose) {
        lastPose = pose;
        expiresAt = now + FLOOR_HOLD_MS;
      }
      return current(now);
    },
    reset() {
      lastPose = null;
      expiresAt = 0;
    },
  };
}
