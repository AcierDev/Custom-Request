/**
 * View position interface defines a preset camera position and target
 */
export interface ViewPosition {
  id: string;
  name: string;
  cameraPosition: [number, number, number];
  rotation?: [number, number, number]; // Rotation in degrees [x, y, z]
  fov?: number;
  description?: string;
}

/**
 * Room configuration with predefined view positions
 */
export interface RoomViewConfig {
  id: string;
  name: string;
  modelPath: string;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  ambientIntensity: number;
  viewPositions: ViewPosition[];
  objectsToRemove?: string[]; // Array of object names to remove from the room model
}

/**
 * Array of room configurations with predefined view positions
 */
export const roomConfigurations: RoomViewConfig[] = [
  {
    id: "bedroom",
    name: "Bedroom",
    modelPath: "/models/room/bedroom.glb",
    position: [0, -1, 0],
    scale: [1, 1, 1],
    rotation: [0, 0, 0],
    ambientIntensity: 0.7,
    objectsToRemove: [
      "CTRL_Hole",
      "Window_3",
      "Cube011",
      "Cylinder001",
      "lamp_desk",
      "lamp_ceiling",
    ],
    viewPositions: [
      {
        id: "bed-view",
        name: "Bed View",
        cameraPosition: [-1.2, 0.8, -4],
        rotation: [5, -23, 0], // Converted to degrees
        fov: 60,
        description: "View from the bed looking at the artwork",
      },
      {
        id: "doorway",
        name: "Doorway",
        cameraPosition: [0.5, 1, -2.5],
        rotation: [5, -34, 0], // Converted to degrees
        fov: 70,
        description: "View from the doorway",
      },
      {
        id: "close-up",
        name: "Close-up",
        cameraPosition: [-2.7, 1.2, -6.5],
        rotation: [0, -6, 0], // Converted to degrees
        fov: 45,
        description: "Close-up view of the artwork",
      },
      {
        id: "corner",
        name: "Corner View",
        cameraPosition: [-2, 1, -3],
        rotation: [5, -29, 0], // Converted to degrees
        fov: 65,
        description: "View from the corner of the room",
      },
    ],
  },
  {
    id: "room2",
    name: "New Room",
    modelPath: "/models/room/room2.glb",
    position: [0, -1, 0],
    scale: [1, 1, 1],
    rotation: [0, 0, 0],
    ambientIntensity: 0.7,
    objectsToRemove: ["Painting_03"],
    viewPositions: [
      {
        id: "position-1",
        name: "Center View",
        cameraPosition: [-3.27, 0.13, 2.7],
        rotation: [179.7, -39.4, 179.8],
        fov: 65,
        description: "Centered view of the room",
      },
      {
        id: "position-2",
        name: "Corner Angle",
        cameraPosition: [-0.83, 0.73, 1.93],
        rotation: [-177.0, 0.9, -180.0],
        fov: 70,
        description: "View from the corner angle",
      },
      {
        id: "position-3",
        name: "Window View",
        cameraPosition: [-0.85, 0.18, 1.93],
        rotation: [179.8, 0.1, -180.0],
        fov: 65,
        description: "Looking towards the window",
      },
      {
        id: "position-4",
        name: "Front View",
        cameraPosition: [-0.57, 0.3, -3.87],
        rotation: [0.9, 58.9, -0.8],
        fov: 75,
        description: "Front view of the space",
      },
      {
        id: "entrance",
        name: "Entrance",
        cameraPosition: [-1, 0.3, -0.6],
        rotation: [0, 30, 0],
        fov: 75,
        description: "View from the entrance",
      },
      {
        id: "sitting-area",
        name: "Sitting Area",
        cameraPosition: [-3.23, 0.86, -3.9],
        rotation: [0, 1, 0],
        fov: 60,
        description: "View from the sitting area",
      },
    ],
  },
];
