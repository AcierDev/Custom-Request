"use client";

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, TransformControls } from "@react-three/drei";
import {
  Suspense,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Card } from "@/components/ui/card";
import {
  Info,
  Sun,
  SunDim,
  Plus,
  Trash2,
  Lightbulb,
  Move,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  X,
  ArrowDown,
} from "lucide-react";
import * as THREE from "three";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArtDisplay } from "./components/ArtDisplay";
import { useRouter } from "next/navigation";

// Define light types
type LightType = "point" | "spot" | "directional";

// Define a custom light object
interface CustomLight {
  id: string;
  type: LightType;
  position: [number, number, number];
  intensity: number;
  color: string;
  castShadow: boolean;
  enabled: boolean; // Whether the light is on or off
  angle?: number; // for spotlights
  penumbra?: number; // for spotlights
  distance?: number; // for point and spotlights
  decay?: number; // for point and spotlights
  target?: [number, number, number]; // for directional and spotlight lights
}

// Room configuration interface
interface RoomObject {
  modelPath: string;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  modelId: string;
}

interface ArtDisplayObject {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  displayId: string;
}

interface RoomConfig {
  id: string;
  name: string;
  roomModel: {
    modelPath: string;
    position: [number, number, number];
    scale: [number, number, number];
    rotation: [number, number, number];
  };
  lights: CustomLight[];
  objects: RoomObject[];
  artDisplays: ArtDisplayObject[];
  ambientIntensity: number;
}

// Bedroom model path
const BEDROOM_MODEL_PATH = "/models/room/bedroom.glb";
const COUCH_MODEL_PATH = "/models/room/couch2.glb";
const LAMP_MODEL_PATH = "/models/room/lamp.glb";
const TREE_MODEL_PATH = "/models/room/tree.glb";
const PLANT_MODEL_PATH = "/models/room/plant.glb";

// Room configurations
const roomConfigurations: RoomConfig[] = [
  {
    id: "bedroom",
    name: "Bedroom",
    roomModel: {
      modelPath: "/models/room/bedroom.glb",
      position: [0, -1, 0],
      scale: [1, 1, 1],
      rotation: [0, 0, 0],
    },
    lights: [
      {
        id: "point-1",
        type: "point",
        position: [-1.5, 0.89, -1.6],
        intensity: 2.5,
        distance: 10,
        decay: 0.5,
        color: "#ffffff",
        castShadow: false,
        enabled: true,
      },
      {
        id: "point-2",
        type: "point",
        position: [-4.2, 0.4, -8.5],
        intensity: 1.5,
        distance: 10,
        decay: 0.5,
        color: "#ffffff",
        castShadow: false,
        enabled: true,
      },
      {
        id: "point-3",
        type: "point",
        position: [-4.2, 0.4, -4.5],
        intensity: 1.5,
        distance: 10,
        decay: 0.5,
        color: "#ffffff",
        castShadow: false,
        enabled: true,
      },
      {
        id: "point-4",
        type: "point",
        position: [3.47458, -0.3297, 8.73249],
        intensity: 13.8,
        distance: 20.0,
        decay: 0.1,
        color: "#ffffff",
        castShadow: true,
        enabled: false,
      },
      {
        id: "spot-1",
        type: "spot",
        position: [2.45371, 0.94481, 5.45786],
        intensity: 5.0,
        angle: Math.PI / 6,
        penumbra: 0.5,
        distance: 10,
        decay: 2,
        color: "#ffffff",
        castShadow: false,
        enabled: false,
        target: [-2.6275, 0.50961, 0.70908],
      },
      {
        id: "directional-1",
        type: "directional",
        position: [5.25455, 3.12047, 9.40658],
        intensity: 29.4,
        color: "#ffffff",
        castShadow: true,
        enabled: false,
        target: [-4.8457, 0.30806, 0.70333],
      },
      {
        id: "point-5",
        type: "point",
        position: [0.1, 0.2, -9],
        intensity: 2,
        distance: 10,
        decay: 0.5,
        color: "#ffffff",
        castShadow: false,
        enabled: true,
      },
    ],
    objects: [
      {
        modelPath: COUCH_MODEL_PATH,
        position: [-4.2, -1, -7.5],
        scale: [0.01, 0.01, 0.01],
        rotation: [0, Math.PI / 2, 0],
        modelId: "couch",
      },
      {
        modelPath: TREE_MODEL_PATH,
        position: [1, -5, 5],
        scale: [1, 1, 1],
        rotation: [0, 0, 0],
        modelId: "tree",
      },
      {
        modelPath: PLANT_MODEL_PATH,
        position: [-4, -1, -9.5],
        scale: [0.7, 0.7, 0.7],
        rotation: [0, 0, 0],
        modelId: "plant",
      },
    ],
    artDisplays: [
      {
        position: [-3.3, 1.15, -6.9],
        rotation: [0, Math.PI / 2, 0],
        scale: 0.7,
        displayId: "art-1",
      },
    ],
    ambientIntensity: 0.7,
  },
  {
    id: "room2",
    name: "New Room",
    roomModel: {
      modelPath: "/models/room/room2.glb",
      position: [0, -1, 0],
      scale: [1, 1, 1],
      rotation: [0, 0, 0],
    },
    lights: [
      {
        id: "point-1",
        type: "point",
        position: [3.7, 0.8, 0.4],
        intensity: 5,
        distance: 20,
        decay: 1.3,
        color: "#ffffff",
        castShadow: false,
        enabled: false,
      },
      {
        id: "point-2",
        type: "point",
        position: [3.8, 0.8, -4.9],
        intensity: 5,
        distance: 20,
        decay: 1.3,
        color: "#ffffff",
        castShadow: false,
        enabled: false,
      },
      {
        id: "point-3",
        type: "point",
        position: [-0.3706, 0.635, 4.836],
        intensity: 0.8,
        distance: 10,
        decay: 0.5,
        color: "#ffffff",
        castShadow: false,
        enabled: true,
      },
      {
        id: "point-4",
        type: "point",
        position: [-0.88, 0.635, 4.836],
        intensity: 0.8,
        distance: 10,
        decay: 0.5,
        color: "#ffffff",
        castShadow: false,
        enabled: true,
      },
      {
        id: "point-5",
        type: "point",
        position: [-1.39, 0.635, 4.836],
        intensity: 0.8,
        distance: 10,
        decay: 0.5,
        color: "#ffffff",
        castShadow: false,
        enabled: true,
      },
      {
        id: "point-6",
        type: "point",
        position: [-5.71, 0.02, -6.55],
        intensity: 0.9,
        distance: 10,
        decay: 0.5,
        color: "#ffffff",
        castShadow: false,
        enabled: true,
      },
      {
        id: "point-7",
        type: "point",
        position: [0.89964, 0.37905, -6.0276],
        intensity: 1,
        distance: 10.0,
        decay: 0.5,
        color: "#ffffff",
        castShadow: false,
        enabled: true,
      },
      {
        id: "point-8",
        type: "point",
        position: [-3.0464, 1.30455, -4.432],
        intensity: 1.6,
        distance: 10.0,
        decay: 1.0,
        color: "#ffffff",
        castShadow: false,
        enabled: true,
      },
      {
        id: "point-9",
        type: "point",
        position: [-3.2967, 1.14111, -3.2537],
        intensity: 1.5,
        distance: 10.0,
        decay: 1.1,
        color: "#ffffff",
        castShadow: false,
        enabled: true,
      },
    ],
    objects: [],
    artDisplays: [
      {
        position: [-2.7, 1.6, -5.2],
        rotation: [0, 0, 0],
        scale: 0.6,
        displayId: "art-2",
      },
    ],
    ambientIntensity: 1,
  },
];

// Custom light component
function CustomLightComponent({
  light,
  selected,
  onSelect,
  onUpdate,
  transformMode,
}: {
  light: CustomLight;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (updatedLight: CustomLight) => void;
  transformMode: "translate" | "rotate";
}) {
  // Use specific refs for each light type
  const pointLightRef = useRef<THREE.PointLight>(null);
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);
  const { camera } = useThree();

  // Get the appropriate ref based on light type
  const getLightRef = () => {
    if (light.type === "point") return pointLightRef;
    if (light.type === "spot") return spotLightRef;
    return directionalLightRef;
  };

  // Update light position when transformed
  const handleTransform = (e: any) => {
    const ref = getLightRef();
    if (ref.current) {
      const newPosition: [number, number, number] = [
        ref.current.position.x,
        ref.current.position.y,
        ref.current.position.z,
      ];

      // If we're transforming the target for a directional or spotlight
      if (
        (light.type === "directional" || light.type === "spot") &&
        transformMode === "translate" &&
        targetRef.current
      ) {
        const newTarget: [number, number, number] = [
          targetRef.current.position.x,
          targetRef.current.position.y,
          targetRef.current.position.z,
        ];
        onUpdate({ ...light, position: newPosition, target: newTarget });
      } else {
        onUpdate({ ...light, position: newPosition });
      }
    }
  };

  // Set up directional light target
  useEffect(() => {
    if (
      (light.type === "directional" || light.type === "spot") &&
      (directionalLightRef.current || spotLightRef.current) &&
      targetRef.current
    ) {
      // Set the target position
      if (light.target) {
        targetRef.current.position.set(...light.target);
      } else {
        // Default target is below the light
        targetRef.current.position.set(
          light.position[0],
          light.position[1] - 1,
          light.position[2]
        );
      }

      // Connect the light to its target
      if (light.type === "directional" && directionalLightRef.current) {
        directionalLightRef.current.target = targetRef.current;
      } else if (light.type === "spot" && spotLightRef.current) {
        spotLightRef.current.target = targetRef.current;
      }
    }
  }, [light]);

  // Helper to visualize light
  const LightHelper = () => {
    if (!selected) return null;

    if (light.type === "directional" && directionalLightRef.current) {
      return (
        <directionalLightHelper
          args={[directionalLightRef.current, 0.5, light.color]}
        />
      );
    } else if (light.type === "spot" && spotLightRef.current) {
      return <spotLightHelper args={[spotLightRef.current, light.color]} />;
    } else if (light.type === "point" && pointLightRef.current) {
      return (
        <pointLightHelper args={[pointLightRef.current, 0.3, light.color]} />
      );
    }
    return null;
  };

  // Helper to visualize directional light target
  const DirectionalTargetHelper = () => {
    if (
      !selected ||
      (light.type !== "directional" && light.type !== "spot") ||
      !light.enabled
    )
      return null;

    const targetPos = light.target || [
      light.position[0],
      light.position[1] - 1,
      light.position[2],
    ];

    return (
      <>
        {/* Line connecting light to target */}
        <line>
          <bufferGeometry attach="geometry">
            <float32BufferAttribute
              attach="attributes-position"
              args={[
                new Float32Array([
                  light.position[0],
                  light.position[1],
                  light.position[2],
                  targetPos[0],
                  targetPos[1],
                  targetPos[2],
                ]),
                3,
              ]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            attach="material"
            color={light.color}
            linewidth={2}
          />
        </line>

        {/* Small sphere at target position */}
        <mesh position={targetPos}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color={light.color} />
        </mesh>
      </>
    );
  };

  // Render the appropriate light type
  const renderLight = () => {
    if (!light.enabled) return null;

    if (light.type === "point") {
      return (
        <pointLight
          ref={pointLightRef}
          position={light.position}
          intensity={light.intensity}
          color={light.color}
          castShadow={light.castShadow}
          distance={light.distance || 0}
          decay={light.decay || 2}
          onClick={onSelect}
        />
      );
    } else if (light.type === "spot") {
      return (
        <>
          <spotLight
            ref={spotLightRef}
            position={light.position}
            intensity={light.intensity}
            color={light.color}
            castShadow={light.castShadow}
            angle={light.angle || Math.PI / 6}
            penumbra={light.penumbra || 0.5}
            distance={light.distance || 0}
            decay={light.decay || 2}
            onClick={onSelect}
          />
          <object3D
            ref={targetRef}
            position={
              light.target || [
                light.position[0],
                light.position[1] - 1,
                light.position[2],
              ]
            }
          />
        </>
      );
    } else {
      return (
        <>
          <directionalLight
            ref={directionalLightRef}
            position={light.position}
            intensity={light.intensity}
            color={light.color}
            castShadow={light.castShadow}
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            onClick={onSelect}
          />
          <object3D
            ref={targetRef}
            position={
              light.target || [
                light.position[0],
                light.position[1] - 1,
                light.position[2],
              ]
            }
          />
        </>
      );
    }
  };

  return (
    <>
      {renderLight()}
      {selected && light.enabled && <LightHelper />}
      {selected &&
        light.enabled &&
        (light.type === "directional" || light.type === "spot") && (
          <DirectionalTargetHelper />
        )}
      {selected && light.enabled && getLightRef().current && (
        <TransformControls
          object={getLightRef().current as THREE.Object3D}
          mode={transformMode}
          size={0.5}
          onObjectChange={handleTransform}
          onMouseDown={() => {
            if (camera.userData.controls) {
              camera.userData.controls.enabled = false;
            }
          }}
          onMouseUp={() => {
            if (camera.userData.controls) {
              camera.userData.controls.enabled = true;
            }
          }}
        />
      )}
      {selected &&
        light.enabled &&
        (light.type === "directional" || light.type === "spot") &&
        targetRef.current &&
        transformMode === "translate" && (
          <TransformControls
            object={targetRef.current as THREE.Object3D}
            mode="translate"
            size={0.3}
            onObjectChange={handleTransform}
            onMouseDown={() => {
              if (camera.userData.controls) {
                camera.userData.controls.enabled = false;
              }
            }}
            onMouseUp={() => {
              if (camera.userData.controls) {
                camera.userData.controls.enabled = true;
              }
            }}
          />
        )}
    </>
  );
}

// Lights component to manage all lights in the scene
function Lights({
  ambientIntensity,
  customLights,
  selectedLight,
  onSelectLight,
  onUpdateLight,
  transformMode,
}: {
  ambientIntensity: number;
  customLights: CustomLight[];
  selectedLight: string | null;
  onSelectLight: (id: string) => void;
  onUpdateLight: (updatedLight: CustomLight) => void;
  transformMode: "translate" | "rotate";
}) {
  return (
    <>
      <ambientLight intensity={ambientIntensity} />
      {customLights.map((light) => (
        <CustomLightComponent
          key={light.id}
          light={light}
          selected={selectedLight === light.id}
          onSelect={() => onSelectLight(light.id)}
          onUpdate={onUpdateLight}
          transformMode={transformMode}
        />
      ))}
    </>
  );
}

// Model component with object visibility control
function Model({
  filePath,
  position = [0, -1, 0],
  hiddenObjects,
  onObjectsLoaded,
  scale = [1, 1, 1],
  modelId,
  rotation = [0, 0, 0],
}: {
  filePath: string;
  position?: [number, number, number];
  hiddenObjects: string[];
  onObjectsLoaded: (
    objects: { name: string; type: string; modelId: string }[]
  ) => void;
  scale?: [number, number, number];
  modelId: string;
  rotation?: [number, number, number];
}) {
  const gltfModel = useGLTF(filePath);
  const [modelLoaded, setModelLoaded] = useState(false);
  const modelRef = useRef<THREE.Group>(null);

  // Clone the scene to ensure each instance is unique
  const clonedScene = useMemo(() => gltfModel.scene.clone(), [gltfModel.scene]);

  // Use useEffect to ensure this only happens once
  useEffect(() => {
    // console.log(gltfModel);

    if (filePath === BEDROOM_MODEL_PATH) {
      const carpet = clonedScene.getObjectByName("rug");
      if (carpet) {
        carpet.position.y += 0.001; // Raise the carpet slightly
      }

      const light = clonedScene.getObjectByName("Sphere");
      if (light) {
        light.traverse((child: any) => {
          if (child.isMesh) {
            // child.material.opacity = 0.9; // Half-transparent
            // child.material.transparent = true;
          }
        });
      }

      const removeObject = (objectName: string) => {
        const object = clonedScene.getObjectByName(objectName);
        if (object) {
          object.traverse((child: any) => {
            if (child.isMesh) {
              child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach((mat: any) => mat.dispose());
                } else {
                  child.material.dispose();
                }
              }
            }
          });

          // Remove object and its children
          object.parent?.remove(object);
        }
      };

      removeObject("CTRL_Hole");
      removeObject("Window_3");
      removeObject("Cube011");
      removeObject("Cylinder001");
      removeObject("Painting_03");
    }

    // Extract all objects from the model
    const objects: { name: string; type: string; modelId: string }[] = [];
    clonedScene.traverse((child: any) => {
      if (child.isMesh && child.name) {
        objects.push({ name: child.name, type: "Mesh", modelId });
      } else if (child.isGroup && child.name) {
        objects.push({ name: child.name, type: "Group", modelId });
      }
    });

    // Sort objects by name
    objects.sort((a, b) => a.name.localeCompare(b.name));

    // Notify parent component about loaded objects
    onObjectsLoaded(objects);
    setModelLoaded(true);
  }, [clonedScene, onObjectsLoaded, filePath, modelId]);

  // Apply visibility settings whenever hiddenObjects changes
  useEffect(() => {
    if (!modelLoaded) return;

    clonedScene.traverse((child: any) => {
      if ((child.isMesh || child.isGroup) && child.name) {
        child.visible = !hiddenObjects.includes(child.name);
      }
    });
  }, [hiddenObjects, clonedScene, modelLoaded]);

  // Apply materials and shadows
  clonedScene.traverse((child: any) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material.roughness = 0.7;
        child.material.metalness = 0.2;
      }
    }
  });

  return (
    <primitive
      ref={modelRef}
      object={clonedScene}
      scale={scale}
      rotation={rotation}
      position={position}
    />
  );
}

// Camera controls component with WASD movement
function CameraControls() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const moveSpeed = useRef(0.1);

  // Handle key press events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Process camera movement each frame
  useFrame(() => {
    if (!controlsRef.current) return;

    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();

    // Get forward and right vectors from camera
    camera.getWorldDirection(forward);
    right.crossVectors(camera.up, forward).normalize();

    // Remove vertical component for level movement
    forward.y = 0;
    forward.normalize();

    // Apply movement based on keys pressed
    let moved = false;

    if (keysPressed.current["w"]) {
      camera.position.addScaledVector(forward, moveSpeed.current);
      moved = true;
    }
    if (keysPressed.current["s"]) {
      camera.position.addScaledVector(forward, -moveSpeed.current);
      moved = true;
    }
    if (keysPressed.current["a"]) {
      camera.position.addScaledVector(right, moveSpeed.current);
      moved = true;
    }
    if (keysPressed.current["d"]) {
      camera.position.addScaledVector(right, -moveSpeed.current);
      moved = true;
    }
    // Add vertical movement with arrow keys
    if (keysPressed.current["q"]) {
      camera.position.y += moveSpeed.current;
      moved = true;
    }
    if (keysPressed.current["e"]) {
      camera.position.y -= moveSpeed.current;
      moved = true;
    }

    // Update controls target if we moved
    if (moved) {
      const target = new THREE.Vector3();
      target.copy(camera.position).add(forward);
      controlsRef.current.target.copy(target);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={1}
      maxDistance={5}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 1.5}
      makeDefault
      onUpdate={() => {
        if (controlsRef.current && camera) {
          camera.userData.controls = controlsRef.current;
        }
      }}
    />
  );
}

// FPS counter component (inside the Canvas)
function CanvasFpsCounter() {
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastUpdateTimeRef = useRef(0);
  const updateIntervalMs = 500; // Update every 500ms

  useFrame((_, delta) => {
    frameCountRef.current += 1;
    const currentTime = performance.now();

    // Only update the display every updateIntervalMs
    if (currentTime - lastUpdateTimeRef.current > updateIntervalMs) {
      // Calculate average FPS over the update interval
      const elapsedSeconds = (currentTime - lastUpdateTimeRef.current) / 1000;
      const smoothedFps = Math.round(frameCountRef.current / elapsedSeconds);

      setFps(smoothedFps);
      frameCountRef.current = 0;
      lastUpdateTimeRef.current = currentTime;
    }
  });

  // Use Dom Overlay to display HTML outside the Canvas
  useThree(({ gl }) => {
    const container = gl.domElement.parentNode;

    if (container) {
      // Check if the FPS counter already exists
      let fpsCounter = document.getElementById("fps-counter");

      if (!fpsCounter) {
        // Create the FPS counter element if it doesn't exist
        fpsCounter = document.createElement("div");
        fpsCounter.id = "fps-counter";
        fpsCounter.className = "absolute bottom-4 right-4 z-10";
        fpsCounter.innerHTML = `
          <div class="py-1 px-3 bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg dark:bg-background/90 rounded-md">
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium">FPS:</span>
              <span id="fps-value" class="text-xs">0</span>
            </div>
          </div>
        `;
        container.appendChild(fpsCounter);
      }

      // Update the FPS value
      const fpsValue = document.getElementById("fps-value");
      if (fpsValue) {
        fpsValue.textContent = fps.toString();
      }
    }
  });

  return null;
}

// Camera info display component
function ModelCameraInfo() {
  const [posInfo, setPosInfo] = useState({
    position: [0, 0, 0],
    rotation: [0, 0, 0],
  });
  const { camera } = useThree();

  // Convert radians to degrees
  const radiansToDegrees = (radians: number) => {
    return radians * (180 / Math.PI);
  };

  useFrame(() => {
    if (camera) {
      // Update position and rotation values
      setPosInfo({
        position: [
          camera.position.x.toFixed(2),
          camera.position.y.toFixed(2),
          camera.position.z.toFixed(2),
        ],
        rotation: [
          radiansToDegrees(camera.rotation.x).toFixed(1),
          radiansToDegrees(camera.rotation.y).toFixed(1),
          radiansToDegrees(camera.rotation.z).toFixed(1),
        ],
      });
    }
  });

  // Render the camera info display using DOM overlay
  useThree(({ gl }) => {
    const container = gl.domElement.parentNode;

    if (container) {
      let cameraInfoEl = document.getElementById("model-camera-info");

      if (!cameraInfoEl) {
        cameraInfoEl = document.createElement("div");
        cameraInfoEl.id = "model-camera-info";
        cameraInfoEl.className = "absolute bottom-4 right-4 z-10";
        cameraInfoEl.innerHTML = `
          <div class="py-2 px-3 bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg dark:bg-background/90 rounded-md">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium">Position:</span>
                <span id="model-camera-position" class="text-xs text-muted-foreground"></span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium">Rotation:</span>
                <span id="model-camera-rotation" class="text-xs text-muted-foreground"></span>
              </div>
            </div>
          </div>
        `;
        container.appendChild(cameraInfoEl);
      }

      // Update values
      const positionEl = document.getElementById("model-camera-position");
      const rotationEl = document.getElementById("model-camera-rotation");

      if (positionEl && rotationEl) {
        positionEl.textContent = `X: ${posInfo.position[0]}, Y: ${posInfo.position[1]}, Z: ${posInfo.position[2]}`;
        rotationEl.textContent = `X: ${posInfo.rotation[0]}°, Y: ${posInfo.rotation[1]}°, Z: ${posInfo.rotation[2]}°`;
      }
    }
  });

  return null;
}

export default function Viewer() {
  const [selectedRoomId, setSelectedRoomId] = useState<string>("bedroom");
  const [showLightingControls, setShowLightingControls] = useState(false);
  const router = useRouter();

  // Get the current room configuration
  const currentRoomConfig =
    roomConfigurations.find((room) => room.id === selectedRoomId) ||
    roomConfigurations[2];

  const [ambientIntensity, setAmbientIntensity] = useState(
    currentRoomConfig.ambientIntensity
  );

  // Custom lights state
  const [customLights, setCustomLights] = useState<CustomLight[]>(
    currentRoomConfig.lights
  );

  // Object visibility state
  const [bedroomObjects, setBedroomObjects] = useState<
    { name: string; type: string; modelId: string }[]
  >([]);
  const [additionalObjects, setAdditionalObjects] = useState<
    { name: string; type: string; modelId: string }[]
  >([]);
  const [hiddenObjects, setHiddenObjects] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<{
    [key: string]: boolean;
  }>({});
  const [objectFilter, setObjectFilter] = useState("");

  // Selected object state
  const [selectedObject, setSelectedObject] = useState<{
    name: string;
    modelId: string;
  } | null>(null);

  // Art display state management
  const [artDisplays, setArtDisplays] = useState<ArtDisplayObject[]>(
    currentRoomConfig.artDisplays || []
  );
  const [selectedArtDisplay, setSelectedArtDisplay] = useState<string | null>(
    null
  );
  const [transformArtMode, setTransformArtMode] = useState<
    "translate" | "rotate"
  >("translate");

  // Update room configuration when room selection changes
  useEffect(() => {
    const selectedRoom = roomConfigurations.find(
      (room) => room.id === selectedRoomId
    );
    if (selectedRoom) {
      setCustomLights(selectedRoom.lights);
      setAmbientIntensity(selectedRoom.ambientIntensity);
      setArtDisplays(selectedRoom.artDisplays || []);
      // Reset selection states
      setSelectedLightId(null);
      setSelectedObject(null);
      setSelectedArtDisplay(null);
      setHiddenObjects([]);
    }
  }, [selectedRoomId]);

  // Handle objects loaded from models
  const handleBedroomObjectsLoaded = useCallback(
    (objects: { name: string; type: string; modelId: string }[]) => {
      setBedroomObjects(objects);
      updateExpandedCategories(objects);
    },
    []
  );

  const handleCouchObjectsLoaded = useCallback(
    (objects: { name: string; type: string; modelId: string }[]) => {
      setAdditionalObjects(objects);
      updateExpandedCategories(objects);
    },
    []
  );

  // Handle object selection
  const handleObjectSelect = useCallback(
    (objectName: string, modelId: string) => {
      setSelectedObject({ name: objectName, modelId });
      setSelectedLightId(null); // Deselect any selected light
    },
    []
  );

  // Update expanded categories
  const updateExpandedCategories = useCallback(
    (objects: { name: string; type: string; modelId: string }[]) => {
      // Group objects by category (first part of name before underscore or number)
      const categories = new Set<string>();
      objects.forEach((obj) => {
        const category = obj.name.split(/[_\d]/)[0];
        if (category) categories.add(category);
      });

      // Initialize expanded state for categories
      const initialExpandedState: { [key: string]: boolean } = {};
      categories.forEach((category) => {
        initialExpandedState[category] = false;
      });
      setExpandedCategories((prev) => ({ ...prev, ...initialExpandedState }));
    },
    []
  );

  // Toggle object visibility
  const toggleObjectVisibility = (objectName: string) => {
    setHiddenObjects((prev) =>
      prev.includes(objectName)
        ? prev.filter((name) => name !== objectName)
        : [...prev, objectName]
    );
  };

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Group objects by category
  const getObjectsByCategory = () => {
    const categories: {
      [key: string]: { name: string; type: string; modelId: string }[];
    } = {};
    const allObjects = [...bedroomObjects, ...additionalObjects];

    allObjects.forEach((obj) => {
      // Skip objects that don't match the filter
      if (
        objectFilter &&
        !obj.name.toLowerCase().includes(objectFilter.toLowerCase())
      ) {
        return;
      }

      const category = obj.name.split(/[_\d]/)[0] || "Other";
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(obj);
    });

    return categories;
  };

  const [selectedLightId, setSelectedLightId] = useState<string | null>(null);
  const [placementMode, setPlacementMode] = useState<LightType | null>(null);
  const [transformMode, setTransformMode] = useState<"translate" | "rotate">(
    "translate"
  );

  // Get the selected light
  const selectedLight = customLights.find(
    (light) => light.id === selectedLightId
  );

  // Handle light selection
  const handleSelectLight = (id: string) => {
    setSelectedLightId(id);
    setPlacementMode(null);
    setSelectedObject(null); // Deselect any selected object
  };

  // Handle light update
  const handleUpdateLight = (updatedLight: CustomLight) => {
    setCustomLights((lights) =>
      lights.map((light) =>
        light.id === updatedLight.id ? updatedLight : light
      )
    );
  };

  // Handle adding a new light
  const handleAddLight = (type: LightType) => {
    setPlacementMode(type);
    setSelectedLightId(null);
  };

  // Handle placing a new light in the scene
  const handlePlaceLight = () => {
    if (!placementMode) return;

    // Create a new light at a default position
    const newLight: CustomLight = {
      id: `${placementMode}-${Date.now()}`,
      type: placementMode,
      position: [0, 3, 0],
      intensity: 5,
      distance: 10,
      decay: 0.5,
      color: "#ffffff",
      castShadow: true,
      enabled: true,
    };

    if (placementMode === "spot") {
      newLight.angle = Math.PI / 6;
      newLight.penumbra = 0.5;
      newLight.distance = 10;
      newLight.decay = 2;
      // Set default target for spotlight
      newLight.target = [0, 0, 0];
    } else if (placementMode === "point") {
      newLight.distance = 10;
      newLight.decay = 2;
    } else if (placementMode === "directional") {
      // Set default target below the light
      newLight.target = [0, 0, 0];
    }

    setCustomLights((prev) => [...prev, newLight]);
    setSelectedLightId(newLight.id);
    setPlacementMode(null);
  };

  // Handle deleting a light
  const handleDeleteLight = () => {
    if (!selectedLightId) return;

    setCustomLights((lights) =>
      lights.filter((light) => light.id !== selectedLightId)
    );
    setSelectedLightId(null);
  };

  // Update light property
  const updateLightProperty = (property: keyof CustomLight, value: any) => {
    if (!selectedLightId) return;

    setCustomLights((lights) =>
      lights.map((light) => {
        if (light.id === selectedLightId) {
          return { ...light, [property]: value };
        }
        return light;
      })
    );
  };

  // Update light position directly
  const updateLightPosition = (axis: "x" | "y" | "z", value: number) => {
    if (!selectedLightId) return;

    setCustomLights((lights) =>
      lights.map((light) => {
        if (light.id === selectedLightId) {
          const newPosition: [number, number, number] = [...light.position];
          if (axis === "x") newPosition[0] = value;
          if (axis === "y") newPosition[1] = value;
          if (axis === "z") newPosition[2] = value;
          return { ...light, position: newPosition };
        }
        return light;
      })
    );
  };

  // Update light target position directly
  const updateLightTarget = (axis: "x" | "y" | "z", value: number) => {
    if (!selectedLightId) return;

    setCustomLights((lights) =>
      lights.map((light) => {
        if (light.id === selectedLightId && light.type === "directional") {
          const newTarget: [number, number, number] = light.target
            ? [...light.target]
            : [light.position[0], light.position[1] - 1, light.position[2]];

          if (axis === "x") newTarget[0] = value;
          if (axis === "y") newTarget[1] = value;
          if (axis === "z") newTarget[2] = value;

          return { ...light, target: newTarget };
        }
        return light;
      })
    );
  };

  // Handle adding a new art display
  const handleAddArtDisplay = () => {
    const newArtDisplay: ArtDisplayObject = {
      position: [0, 1, 0],
      rotation: [0, 0, 0],
      scale: 0.7,
      displayId: `art-${Date.now()}`,
    };

    setArtDisplays((prev) => [...prev, newArtDisplay]);
    setSelectedArtDisplay(newArtDisplay.displayId);
    setSelectedLightId(null);
    setSelectedObject(null);
  };

  // Handle deleting an art display
  const handleDeleteArtDisplay = () => {
    if (!selectedArtDisplay) return;

    setArtDisplays((displays) =>
      displays.filter((display) => display.displayId !== selectedArtDisplay)
    );
    setSelectedArtDisplay(null);
  };

  // Update art display position
  const updateArtDisplayPosition = (axis: "x" | "y" | "z", value: number) => {
    if (!selectedArtDisplay) return;

    setArtDisplays((displays) =>
      displays.map((display) => {
        if (display.displayId === selectedArtDisplay) {
          const newPosition: [number, number, number] = [...display.position];
          if (axis === "x") newPosition[0] = value;
          if (axis === "y") newPosition[1] = value;
          if (axis === "z") newPosition[2] = value;
          return { ...display, position: newPosition };
        }
        return display;
      })
    );
  };

  // Update art display rotation
  const updateArtDisplayRotation = (axis: "x" | "y" | "z", value: number) => {
    if (!selectedArtDisplay) return;

    setArtDisplays((displays) =>
      displays.map((display) => {
        if (display.displayId === selectedArtDisplay) {
          const newRotation: [number, number, number] = [...display.rotation];
          if (axis === "x") newRotation[0] = value;
          if (axis === "y") newRotation[1] = value;
          if (axis === "z") newRotation[2] = value;
          return { ...display, rotation: newRotation };
        }
        return display;
      })
    );
  };

  // Update art display scale
  const updateArtDisplayScale = (value: number) => {
    if (!selectedArtDisplay) return;

    setArtDisplays((displays) =>
      displays.map((display) => {
        if (display.displayId === selectedArtDisplay) {
          return { ...display, scale: value };
        }
        return display;
      })
    );
  };

  return (
    <div className="relative w-full h-screen bg-background">
      {/* Room Selector */}
      <Card className="absolute top-4 left-4 p-2 z-20 bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg dark:bg-background/90">
        <div className="flex items-center gap-2">
          <Label className="text-xs">Room:</Label>
          <div className="flex gap-1">
            {roomConfigurations.map((room) => (
              <Button
                key={room.id}
                variant={selectedRoomId === room.id ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSelectedRoomId(room.id)}
              >
                {room.name}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* View Art Button */}
      <Button
        variant="secondary"
        size="sm"
        className="absolute top-4 right-4 z-20 bg-background/80 backdrop-blur-sm"
        onClick={() => router.push("/viewer")}
      >
        <Eye className="h-4 w-4 mr-2" />
        View Art
      </Button>

      {/* Controls Info Card */}
      <Card className="absolute top-20 right-4 p-4 z-10 bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg dark:bg-background/90">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 mt-0.5 text-muted-foreground" />
          <div className="space-y-2">
            <h3 className="font-medium">Model Controls</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>🖱️ Left Click + Drag: Rotate model</li>
              <li>🖱️ Right Click + Drag: Pan view</li>
              <li>🖱️ Scroll: Zoom in/out</li>
              <li>🖱️ Middle Click + Drag: Orbit</li>
              <li>⌨️ WASD: Move camera horizontally</li>
              <li>⌨️ ↑↓: Move camera up/down</li>
              {placementMode && (
                <li className="font-medium text-primary">
                  Click to place {placementMode} light
                </li>
              )}
            </ul>
          </div>
        </div>
      </Card>

      {/* Lighting Controls Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        className="absolute top-20 left-4 z-10"
        onClick={() => setShowLightingControls(!showLightingControls)}
      >
        {showLightingControls ? (
          <SunDim className="h-5 w-5" />
        ) : (
          <Sun className="h-5 w-5" />
        )}
      </Button>

      {/* Lighting Controls Panel */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{
          opacity: showLightingControls ? 1 : 0,
          x: showLightingControls ? 0 : -20,
        }}
        className={`absolute top-36 left-4 z-10 w-80 ${
          !showLightingControls && "pointer-events-none"
        }`}
      >
        <Card className="p-4 bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg dark:bg-background/90">
          <Tabs defaultValue="lights" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="lights">Lights</TabsTrigger>
              <TabsTrigger value="objects">Objects</TabsTrigger>
              <TabsTrigger value="art">Art</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="lights" className="space-y-4 mt-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Scene Lights</h3>
                <div className="flex gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleAddLight("point")}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add Point Light</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleAddLight("spot")}
                        >
                          <Lightbulb className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add Spot Light</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleAddLight("directional")}
                        >
                          <Sun className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add Directional Light</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {selectedLightId && (
                    <>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={
                                transformMode === "translate"
                                  ? "default"
                                  : "outline"
                              }
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setTransformMode("translate")}
                            >
                              <Move className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Move Light</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={
                                transformMode === "rotate"
                                  ? "default"
                                  : "outline"
                              }
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setTransformMode("rotate")}
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Rotate Light</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={handleDeleteLight}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete Selected Light</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {customLights.map((light) => (
                  <Button
                    key={light.id}
                    variant={
                      selectedLightId === light.id ? "default" : "outline"
                    }
                    className="w-full justify-start text-left h-auto py-2"
                    onClick={() => handleSelectLight(light.id)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className="flex items-center gap-2 flex-1">
                        {light.type === "point" && (
                          <Plus
                            className={`h-4 w-4 ${
                              !light.enabled ? "text-muted-foreground" : ""
                            }`}
                          />
                        )}
                        {light.type === "spot" && (
                          <Lightbulb
                            className={`h-4 w-4 ${
                              !light.enabled ? "text-muted-foreground" : ""
                            }`}
                          />
                        )}
                        {light.type === "directional" && (
                          <Sun
                            className={`h-4 w-4 ${
                              !light.enabled ? "text-muted-foreground" : ""
                            }`}
                          />
                        )}
                        <div>
                          <div
                            className={`font-medium ${
                              !light.enabled ? "text-muted-foreground" : ""
                            }`}
                          >
                            {light.type.charAt(0).toUpperCase() +
                              light.type.slice(1)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            [{light.position[0].toFixed(1)},{" "}
                            {light.position[1].toFixed(1)},{" "}
                            {light.position[2].toFixed(1)}]
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={light.enabled}
                        onCheckedChange={(checked) => {
                          setCustomLights((lights) =>
                            lights.map((l) =>
                              l.id === light.id ? { ...l, enabled: checked } : l
                            )
                          );
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="ml-auto"
                      />
                    </div>
                  </Button>
                ))}
              </div>

              {selectedLight && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium">Light Properties</h3>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="light-enabled" className="text-xs">
                        Enabled
                      </Label>
                      <Switch
                        id="light-enabled"
                        checked={selectedLight.enabled}
                        onCheckedChange={(checked) =>
                          updateLightProperty("enabled", checked)
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {/* Position Controls */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Position</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <Label htmlFor="position-x" className="text-xs">
                              X
                            </Label>
                            <span className="text-xs text-muted-foreground">
                              {selectedLight.position[0].toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={selectedLight.position[0]}
                              onChange={(e) =>
                                updateLightPosition(
                                  "x",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full h-7 text-xs"
                              step={0.1}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <Label htmlFor="position-y" className="text-xs">
                              Y
                            </Label>
                            <span className="text-xs text-muted-foreground">
                              {selectedLight.position[1].toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={selectedLight.position[1]}
                              onChange={(e) =>
                                updateLightPosition(
                                  "y",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full h-7 text-xs"
                              step={0.1}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <Label htmlFor="position-z" className="text-xs">
                              Z
                            </Label>
                            <span className="text-xs text-muted-foreground">
                              {selectedLight.position[2].toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={selectedLight.position[2]}
                              onChange={(e) =>
                                updateLightPosition(
                                  "z",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full h-7 text-xs"
                              step={0.1}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Target Controls for Directional and Spot Lights */}
                    {(selectedLight.type === "directional" ||
                      selectedLight.type === "spot") && (
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">
                          {selectedLight.type === "directional"
                            ? "Direction Target"
                            : "Spotlight Target"}
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <Label htmlFor="target-x" className="text-xs">
                                X
                              </Label>
                              <span className="text-xs text-muted-foreground">
                                {(
                                  selectedLight.target?.[0] ||
                                  selectedLight.position[0]
                                ).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={
                                  selectedLight.target?.[0] ||
                                  selectedLight.position[0]
                                }
                                onChange={(e) =>
                                  updateLightTarget(
                                    "x",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-full h-7 text-xs"
                                step={0.1}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <Label htmlFor="target-y" className="text-xs">
                                Y
                              </Label>
                              <span className="text-xs text-muted-foreground">
                                {(
                                  selectedLight.target?.[1] ||
                                  selectedLight.position[1] - 1
                                ).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={
                                  selectedLight.target?.[1] ||
                                  selectedLight.position[1] - 1
                                }
                                onChange={(e) =>
                                  updateLightTarget(
                                    "y",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-full h-7 text-xs"
                                step={0.1}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <Label htmlFor="target-z" className="text-xs">
                                Z
                              </Label>
                              <span className="text-xs text-muted-foreground">
                                {(
                                  selectedLight.target?.[2] ||
                                  selectedLight.position[2]
                                ).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={
                                  selectedLight.target?.[2] ||
                                  selectedLight.position[2]
                                }
                                onChange={(e) =>
                                  updateLightTarget(
                                    "z",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-full h-7 text-xs"
                                step={0.1}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <Label htmlFor="light-color">Color</Label>
                      <Input
                        id="light-color"
                        type="color"
                        value={selectedLight.color}
                        className="w-24 h-8 p-1"
                        onChange={(e) =>
                          updateLightProperty("color", e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <Label htmlFor="light-intensity">Intensity</Label>
                        <span className="text-xs text-muted-foreground">
                          {selectedLight.intensity.toFixed(1)}
                        </span>
                      </div>
                      <Slider
                        id="light-intensity"
                        value={[selectedLight.intensity]}
                        onValueChange={([value]) =>
                          updateLightProperty("intensity", value)
                        }
                        max={100}
                        step={0.1}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="cast-shadow"
                        checked={selectedLight.castShadow}
                        onCheckedChange={(checked) =>
                          updateLightProperty("castShadow", checked)
                        }
                      />
                      <Label htmlFor="cast-shadow">Cast Shadow</Label>
                    </div>

                    {selectedLight.type === "spot" && (
                      <>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <Label htmlFor="light-angle">Angle</Label>
                            <span className="text-xs text-muted-foreground">
                              {(
                                ((selectedLight.angle || Math.PI / 6) * 180) /
                                Math.PI
                              ).toFixed(0)}
                              °
                            </span>
                          </div>
                          <Slider
                            id="light-angle"
                            value={[selectedLight.angle || Math.PI / 6]}
                            onValueChange={([value]) =>
                              updateLightProperty("angle", value)
                            }
                            max={Math.PI / 2}
                            step={0.01}
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <Label htmlFor="light-penumbra">Penumbra</Label>
                            <span className="text-xs text-muted-foreground">
                              {(selectedLight.penumbra || 0).toFixed(1)}
                            </span>
                          </div>
                          <Slider
                            id="light-penumbra"
                            value={[selectedLight.penumbra || 0]}
                            onValueChange={([value]) =>
                              updateLightProperty("penumbra", value)
                            }
                            max={1}
                            step={0.1}
                          />
                        </div>
                      </>
                    )}

                    {(selectedLight.type === "spot" ||
                      selectedLight.type === "point") && (
                      <>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <Label htmlFor="light-distance">Distance</Label>
                            <span className="text-xs text-muted-foreground">
                              {(selectedLight.distance || 0).toFixed(1)}
                            </span>
                          </div>
                          <Slider
                            id="light-distance"
                            value={[selectedLight.distance || 0]}
                            onValueChange={([value]) =>
                              updateLightProperty("distance", value)
                            }
                            max={20}
                            step={0.5}
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <Label htmlFor="light-decay">Decay</Label>
                            <span className="text-xs text-muted-foreground">
                              {(selectedLight.decay || 2).toFixed(1)}
                            </span>
                          </div>
                          <Slider
                            id="light-decay"
                            value={[selectedLight.decay || 2]}
                            onValueChange={([value]) =>
                              updateLightProperty("decay", value)
                            }
                            max={3}
                            step={0.1}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="objects" className="space-y-4 mt-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Model Objects</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setHiddenObjects([])}
                    >
                      Show All
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <Input
                    placeholder="Filter objects..."
                    value={objectFilter}
                    onChange={(e) => setObjectFilter(e.target.value)}
                    className="w-full h-8 text-xs"
                  />
                  {objectFilter && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-6 w-6"
                      onClick={() => setObjectFilter("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto pr-1 space-y-1">
                  {Object.entries(getObjectsByCategory()).map(
                    ([category, objects]) => (
                      <div key={category} className="space-y-1">
                        <div
                          className="flex items-center gap-1 cursor-pointer hover:bg-accent/50 rounded px-1"
                          onClick={() => toggleCategory(category)}
                        >
                          {expandedCategories[category] ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                          <span className="text-xs font-medium">
                            {category} ({objects.length})
                          </span>
                        </div>

                        {expandedCategories[category] && (
                          <div className="pl-4 space-y-1">
                            {objects.map((obj) => (
                              <div
                                key={obj.name}
                                className={`flex items-center justify-between hover:bg-accent/30 rounded px-1 py-0.5 ${
                                  selectedObject?.name === obj.name &&
                                  selectedObject?.modelId === obj.modelId
                                    ? "bg-accent"
                                    : ""
                                }`}
                              >
                                <div
                                  className="flex items-center gap-1 flex-1 cursor-pointer"
                                  onClick={() =>
                                    handleObjectSelect(obj.name, obj.modelId)
                                  }
                                >
                                  <span
                                    className="text-xs truncate max-w-[180px]"
                                    title={obj.name}
                                  >
                                    {obj.name}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    ({obj.type})
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() =>
                                    toggleObjectVisibility(obj.name)
                                  }
                                >
                                  {hiddenObjects.includes(obj.name) ? (
                                    <EyeOff className="h-3 w-3" />
                                  ) : (
                                    <Eye className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="art" className="space-y-4 mt-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Art Displays</h3>
                <div className="flex gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={handleAddArtDisplay}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Add Art Display</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {selectedArtDisplay && (
                    <>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={
                                transformArtMode === "translate"
                                  ? "default"
                                  : "outline"
                              }
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setTransformArtMode("translate")}
                            >
                              <Move className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Move Art Display</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={
                                transformArtMode === "rotate"
                                  ? "default"
                                  : "outline"
                              }
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setTransformArtMode("rotate")}
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Rotate Art Display</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={handleDeleteArtDisplay}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete Selected Art Display</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {artDisplays.map((art) => (
                  <Button
                    key={art.displayId}
                    variant={
                      selectedArtDisplay === art.displayId
                        ? "default"
                        : "outline"
                    }
                    className="w-full justify-start text-left h-auto py-2"
                    onClick={() => {
                      setSelectedArtDisplay(art.displayId);
                      setSelectedLightId(null);
                      setSelectedObject(null);
                    }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className="flex items-center gap-2 flex-1">
                        <div>
                          <div className="font-medium">Art Display</div>
                          <div className="text-xs text-muted-foreground">
                            [{art.position[0].toFixed(1)},{" "}
                            {art.position[1].toFixed(1)},{" "}
                            {art.position[2].toFixed(1)}]
                          </div>
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>

              {selectedArtDisplay && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium">
                      Art Display Properties
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {/* Position Controls */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Position</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <Label htmlFor="art-position-x" className="text-xs">
                              X
                            </Label>
                            <span className="text-xs text-muted-foreground">
                              {artDisplays
                                .find((a) => a.displayId === selectedArtDisplay)
                                ?.position[0].toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={
                                artDisplays.find(
                                  (a) => a.displayId === selectedArtDisplay
                                )?.position[0]
                              }
                              onChange={(e) =>
                                updateArtDisplayPosition(
                                  "x",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full h-7 text-xs"
                              step={0.1}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <Label htmlFor="art-position-y" className="text-xs">
                              Y
                            </Label>
                            <span className="text-xs text-muted-foreground">
                              {artDisplays
                                .find((a) => a.displayId === selectedArtDisplay)
                                ?.position[1].toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={
                                artDisplays.find(
                                  (a) => a.displayId === selectedArtDisplay
                                )?.position[1]
                              }
                              onChange={(e) =>
                                updateArtDisplayPosition(
                                  "y",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full h-7 text-xs"
                              step={0.1}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <Label htmlFor="art-position-z" className="text-xs">
                              Z
                            </Label>
                            <span className="text-xs text-muted-foreground">
                              {artDisplays
                                .find((a) => a.displayId === selectedArtDisplay)
                                ?.position[2].toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={
                                artDisplays.find(
                                  (a) => a.displayId === selectedArtDisplay
                                )?.position[2]
                              }
                              onChange={(e) =>
                                updateArtDisplayPosition(
                                  "z",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full h-7 text-xs"
                              step={0.1}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Rotation Controls */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Rotation</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <Label htmlFor="art-rotation-x" className="text-xs">
                              X
                            </Label>
                            <span className="text-xs text-muted-foreground">
                              {artDisplays
                                .find((a) => a.displayId === selectedArtDisplay)
                                ?.rotation[0].toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={
                                artDisplays.find(
                                  (a) => a.displayId === selectedArtDisplay
                                )?.rotation[0]
                              }
                              onChange={(e) =>
                                updateArtDisplayRotation(
                                  "x",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full h-7 text-xs"
                              step={0.1}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <Label htmlFor="art-rotation-y" className="text-xs">
                              Y
                            </Label>
                            <span className="text-xs text-muted-foreground">
                              {artDisplays
                                .find((a) => a.displayId === selectedArtDisplay)
                                ?.rotation[1].toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={
                                artDisplays.find(
                                  (a) => a.displayId === selectedArtDisplay
                                )?.rotation[1]
                              }
                              onChange={(e) =>
                                updateArtDisplayRotation(
                                  "y",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full h-7 text-xs"
                              step={0.1}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <Label htmlFor="art-rotation-z" className="text-xs">
                              Z
                            </Label>
                            <span className="text-xs text-muted-foreground">
                              {artDisplays
                                .find((a) => a.displayId === selectedArtDisplay)
                                ?.rotation[2].toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={
                                artDisplays.find(
                                  (a) => a.displayId === selectedArtDisplay
                                )?.rotation[2]
                              }
                              onChange={(e) =>
                                updateArtDisplayRotation(
                                  "z",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full h-7 text-xs"
                              step={0.1}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Scale Control */}
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <Label htmlFor="art-scale">Scale</Label>
                        <span className="text-xs text-muted-foreground">
                          {artDisplays
                            .find((a) => a.displayId === selectedArtDisplay)
                            ?.scale.toFixed(1)}
                        </span>
                      </div>
                      <Slider
                        id="art-scale"
                        value={[
                          artDisplays.find(
                            (a) => a.displayId === selectedArtDisplay
                          )?.scale || 0.7,
                        ]}
                        onValueChange={([value]) =>
                          updateArtDisplayScale(value)
                        }
                        min={0.1}
                        max={2}
                        step={0.1}
                      />
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-2">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Ambient Light</h3>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">
                    Intensity
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {ambientIntensity.toFixed(1)}
                  </span>
                </div>
                <Slider
                  value={[ambientIntensity]}
                  onValueChange={([value]) => setAmbientIntensity(value)}
                  max={2}
                  step={0.1}
                />
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </motion.div>

      <Canvas
        camera={{ position: [0, 0, 2], fov: 75 }}
        className="w-full h-full"
        shadows
        gl={{
          preserveDrawingBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
        onClick={placementMode ? handlePlaceLight : undefined}
        onCreated={({ gl, camera, scene }) => {
          // Store OrbitControls reference on the camera for later access
          camera.userData.controls = null;
        }}
      >
        <Lights
          ambientIntensity={ambientIntensity}
          customLights={customLights}
          selectedLight={selectedLightId}
          onSelectLight={handleSelectLight}
          onUpdateLight={handleUpdateLight}
          transformMode={transformMode}
        />
        <Suspense fallback={null}>
          {/* Main Room Model */}
          <Model
            filePath={currentRoomConfig.roomModel.modelPath}
            position={currentRoomConfig.roomModel.position}
            scale={currentRoomConfig.roomModel.scale}
            rotation={currentRoomConfig.roomModel.rotation}
            hiddenObjects={hiddenObjects}
            onObjectsLoaded={handleBedroomObjectsLoaded}
            modelId="room"
          />

          {/* Room-specific objects */}
          {currentRoomConfig.objects.map((obj, index) => (
            <Model
              key={`${obj.modelId}-${index}`}
              filePath={obj.modelPath}
              position={obj.position}
              scale={obj.scale}
              rotation={obj.rotation}
              hiddenObjects={hiddenObjects}
              onObjectsLoaded={(objects) => {
                // Use a unique handler for each object
                const uniqueObjects = objects.map((o) => ({
                  ...o,
                  modelId: obj.modelId,
                }));
                setAdditionalObjects((prev) => [
                  ...prev.filter((o) => o.modelId !== obj.modelId),
                  ...uniqueObjects,
                ]);
              }}
              modelId={obj.modelId}
            />
          ))}

          {/* Art Displays */}
          {artDisplays.map((art) => (
            <group key={art.displayId}>
              <ArtDisplay
                position={art.position}
                rotation={art.rotation}
                scale={art.scale}
                displayId={art.displayId}
                isSelected={selectedArtDisplay === art.displayId}
                onSelect={() => {
                  setSelectedArtDisplay(art.displayId);
                  setSelectedLightId(null);
                  setSelectedObject(null);
                }}
                transformMode={transformArtMode}
                onTransform={(newPosition) => {
                  setArtDisplays((displays) =>
                    displays.map((display) =>
                      display.displayId === art.displayId
                        ? { ...display, position: newPosition }
                        : display
                    )
                  );
                }}
              />
            </group>
          ))}
        </Suspense>
        <CameraControls />
        {/* Add FPS Counter inside Canvas */}
        <CanvasFpsCounter />
        <ModelCameraInfo />
      </Canvas>
    </div>
  );
}

// Important: Preload the models to prevent memory leaks
useGLTF.preload(BEDROOM_MODEL_PATH);
useGLTF.preload(COUCH_MODEL_PATH);
useGLTF.preload(LAMP_MODEL_PATH);
useGLTF.preload(TREE_MODEL_PATH);
useGLTF.preload(PLANT_MODEL_PATH);
useGLTF.preload("/models/room/room.glb");
useGLTF.preload("/models/room/room2.glb");
