"use client";

import { Html, Line } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { MathUtils, type Group, type Object3D } from "three";
import { applyExplosion, getExplosionPlan, type ExplosionCallout } from "./explodedLayout";
import styles from "./ExplodedModel.module.css";

export { getExplodedBounds } from "./explodedLayout";

const TRAVEL_SECONDS = 0.8;

function ComponentCallout({
  callout,
  progress,
}: {
  callout: ExplosionCallout;
  progress: RefObject<number>;
}) {
  const group = useRef<Group>(null);
  const leader = useRef<Group>(null);
  const points = useMemo<[number, number, number][]>(() => {
    const [x, y, z] = callout.leader;
    return [[0, 0, 0], [x * 0.55, y, z * 0.55], [x, y, z]];
  }, [callout.leader]);

  useFrame(() => {
    const amount = MathUtils.smootherstep(progress.current, 0, 1);
    const reveal = MathUtils.smoothstep(progress.current, 0.55, 0.92);
    group.current?.position.copy(callout.anchor).addScaledVector(callout.offset, amount);
    if (leader.current) {
      leader.current.visible = reveal > 0.01;
      leader.current.scale.setScalar(reveal);
    }
  });

  return (
    <group ref={group} position={callout.anchor}>
      <group ref={leader} visible={false}>
        <mesh scale={0.012}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color="#9f7852" />
        </mesh>
        <Line points={points} color="#947450" lineWidth={1} />
      </group>
      <Html position={[...callout.leader]} center zIndexRange={[2, 1]} style={{ pointerEvents: "none" }}>
        <span className={styles.callout} aria-hidden="true">
          {callout.number}
        </span>
      </Html>
    </group>
  );
}

export function ExplodedModel({
  scene,
  exploded,
  showLabels = true,
}: {
  scene: Object3D;
  exploded: boolean;
  showLabels?: boolean;
}) {
  const plan = useMemo(() => getExplosionPlan(scene), [scene]);
  const progress = useRef(0);
  const reducedMotion = useRef(false);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => {
      reducedMotion.current = query.matches;
      invalidate();
    };
    handleChange();
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, [invalidate]);

  useLayoutEffect(() => {
    applyExplosion(plan, MathUtils.smootherstep(progress.current, 0, 1));
    invalidate();
    return () => applyExplosion(plan, 0);
  }, [invalidate, plan]);

  useLayoutEffect(() => {
    invalidate();
  }, [exploded, invalidate, showLabels]);

  useFrame((_, delta) => {
    const target = exploded ? 1 : 0;
    const current = progress.current;
    if (current === target) return;

    const step = Math.min(delta, 1 / 24) / TRAVEL_SECONDS;
    const next = reducedMotion.current
      ? target
      : current < target
        ? Math.min(target, current + step)
        : Math.max(target, current - step);
    progress.current = next;
    applyExplosion(plan, MathUtils.smootherstep(next, 0, 1));
    if (next !== target) invalidate();
  });

  return (
    <>
      <primitive object={scene} />
      {exploded && showLabels && plan.callouts.map((callout) => (
        <ComponentCallout key={callout.label} callout={callout} progress={progress} />
      ))}
    </>
  );
}
