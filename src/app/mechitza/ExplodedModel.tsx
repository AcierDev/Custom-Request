"use client";

import { Html, Line } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { EdgesGeometry, MathUtils, Vector3, type Group, type LineBasicMaterial, type Mesh, type MeshBasicMaterial, type Object3D } from "three";
import {
  applyExplosion,
  getExplosionPlan,
  isFilmReverse,
  partExplosionProgress,
  type ExplosionCallout,
} from "./explodedLayout";
import styles from "./ExplodedModel.module.css";

export { getExplodedBounds } from "./explodedLayout";

function calloutReveal(progress: number) {
  return MathUtils.smoothstep(progress, 0.47, 0.85);
}

function placeOverlay(group: Group, source: Object3D, visible: boolean) {
  source.updateWorldMatrix(true, false);
  group.matrix.copy(source.matrixWorld);
  group.matrixWorldNeedsUpdate = true;
  group.visible = visible;
}

function FilmReverseEdge({ film, progress }: { film: Mesh; progress: RefObject<number> }) {
  const edges = useMemo(() => new EdgesGeometry(film.geometry), [film.geometry]);
  const group = useRef<Group>(null);
  const material = useRef<LineBasicMaterial>(null);
  const cameraDirection = useMemo(() => new Vector3(), []);

  useEffect(() => () => edges.dispose(), [edges]);

  useFrame(({ camera }) => {
    if (!group.current || !material.current) return;
    const separation = partExplosionProgress("film", progress.current);
    const reveal = MathUtils.smoothstep(separation, 0.16, 0.76);
    const reverseView = MathUtils.smoothstep(-camera.getWorldDirection(cameraDirection).z, 0.04, 0.28);
    const opacity = reveal * reverseView * 0.62;
    material.current.opacity = opacity;
    placeOverlay(group.current, film, opacity > 0.001);
  });

  return (
    <group ref={group} matrixAutoUpdate={false} visible={false}>
      <lineSegments geometry={edges} renderOrder={2}>
        <lineBasicMaterial ref={material} color="#4c4740" transparent opacity={0} depthWrite={false} toneMapped={false} />
      </lineSegments>
    </group>
  );
}

function GlassHighlight({
  pane,
  kind,
  progress,
}: {
  pane: Mesh;
  kind: "glass" | "cover";
  progress: RefObject<number>;
}) {
  const edges = useMemo(() => new EdgesGeometry(pane.geometry, 28), [pane.geometry]);
  const group = useRef<Group>(null);
  const edgeMaterial = useRef<LineBasicMaterial>(null);
  const tintMaterial = useRef<MeshBasicMaterial>(null);

  useEffect(() => () => edges.dispose(), [edges]);

  useFrame(() => {
    if (!group.current) return;
    const amount = MathUtils.smoothstep(partExplosionProgress(kind, progress.current), 0.1, 0.8);
    placeOverlay(group.current, pane, amount > 0.001);
    if (edgeMaterial.current) edgeMaterial.current.opacity = 0.66 * amount;
    if (tintMaterial.current) tintMaterial.current.opacity = 0.09 * amount;
  });

  return (
    <group ref={group} matrixAutoUpdate={false} visible={false}>
      <mesh geometry={pane.geometry}>
        <meshBasicMaterial ref={tintMaterial} color="#87b7c7" transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
      <lineSegments geometry={edges} renderOrder={2}>
        <lineBasicMaterial ref={edgeMaterial} color="#4d7f91" transparent opacity={0} depthWrite={false} toneMapped={false} />
      </lineSegments>
    </group>
  );
}

function ComponentCallout({
  callout,
  progress,
}: {
  callout: ExplosionCallout;
  progress: RefObject<number>;
}) {
  const group = useRef<Group>(null);
  const leader = useRef<Group>(null);
  const marker = useRef<Group>(null);
  const label = useRef<HTMLSpanElement | null>(null);
  const attachLabel = useCallback((element: HTMLSpanElement | null) => {
    label.current = element;
    if (element) element.style.opacity = String(calloutReveal(progress.current));
  }, [progress]);
  const points = useMemo<[number, number, number][]>(() => {
    const [x, y, z] = callout.leader;
    return [[0, 0, 0], [x * 0.55, y, z * 0.55], [x, y, z]];
  }, [callout.leader]);

  useFrame(() => {
    const amount = partExplosionProgress(callout.kind, progress.current);
    const reveal = calloutReveal(progress.current);
    group.current?.position.copy(callout.anchor).addScaledVector(callout.offset, amount);
    if (leader.current) {
      leader.current.visible = reveal > 0.01;
      leader.current.scale.setScalar(reveal);
    }
    marker.current?.position.set(...callout.leader).multiplyScalar(reveal);
    group.current?.updateWorldMatrix(true, true);
    if (label.current) label.current.style.opacity = String(reveal);
  }, -0.4);

  return (
    <group ref={group} position={callout.anchor}>
      <group ref={leader} visible={false}>
        <mesh scale={0.012}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color="#9f7852" />
        </mesh>
        <Line points={points} color="#947450" lineWidth={1} />
      </group>
      <group ref={marker}>
        <Html center zIndexRange={[2, 1]} style={{ pointerEvents: "none" }}>
          <span ref={attachLabel} className={styles.callout} aria-hidden="true">
            {callout.number}
          </span>
        </Html>
      </group>
    </group>
  );
}

export function ExplodedModel({
  scene,
  exploded,
  progress,
  showLabels = true,
}: {
  scene: Object3D;
  exploded: boolean;
  progress: RefObject<number>;
  showLabels?: boolean;
}) {
  const plan = useMemo(() => getExplosionPlan(scene), [scene]);
  const appliedProgress = useRef(0);
  const [separating, setSeparating] = useState(exploded);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    const amount = progress.current;
    applyExplosion(plan, amount);
    appliedProgress.current = amount;
    invalidate();
    return () => applyExplosion(plan, 0);
  }, [invalidate, plan, progress]);

  useLayoutEffect(() => {
    if (exploded || progress.current === 0) setSeparating(exploded);
    invalidate();
  }, [exploded, invalidate, progress, showLabels]);

  useFrame(() => {
    const amount = progress.current;
    if (amount === appliedProgress.current) return;
    appliedProgress.current = amount;
    applyExplosion(plan, amount);
    if (amount === 0 && !exploded) setSeparating(false);
  }, -0.6);

  return (
    <>
      <primitive object={scene} />
      {separating && plan.parts.map(({ kind, node }) => (
        kind === "glass" || kind === "cover" ? (
          <GlassHighlight key={node.uuid} pane={node as Mesh} kind={kind} progress={progress} />
        ) : null
      ))}
      {separating && plan.parts.map(({ kind, node }) => {
        const mesh = node as Mesh;
        return kind === "film" && isFilmReverse(mesh)
          ? <FilmReverseEdge key={node.uuid} film={mesh} progress={progress} />
          : null;
      })}
      {separating && showLabels && plan.callouts.map((callout) => (
        <ComponentCallout key={callout.label} callout={callout} progress={progress} />
      ))}
    </>
  );
}
