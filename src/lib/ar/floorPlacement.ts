const MIN_UPWARD_NORMAL = Math.cos(Math.PI / 9);

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
