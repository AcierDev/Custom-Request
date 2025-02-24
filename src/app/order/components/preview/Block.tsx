"use client";

interface BlockProps {
  position: [number, number, number];
  size: number;
  height: number;
  color: string;
  isHovered?: boolean;
  onHover?: (isHovering: boolean) => void;
  onClick?: () => void;
}

export function Block({
  position,
  size,
  height,
  color,
  isHovered,
  onHover,
  onClick,
}: BlockProps) {
  const [x, y, z] = position;
  const adjustedPosition: [number, number, number] = [x, y, z + height / 2];

  return (
    <mesh
      position={adjustedPosition}
      castShadow
      receiveShadow
      onPointerEnter={(e) => {
        e.stopPropagation();
        onHover?.(true);
      }}
      onPointerLeave={() => onHover?.(false)}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <boxGeometry args={[size, size, height]} />
      <meshStandardMaterial
        color={color}
        roughness={0.7}
        metalness={0.1}
        emissive={color}
        emissiveIntensity={isHovered ? 0.5 : 0}
      />
    </mesh>
  );
}
