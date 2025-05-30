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
 * Configuration for a single art display
 */
export interface ArtDisplayConfig {
  id: string; // Unique identifier for this art display
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
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
  artDisplays: ArtDisplayConfig[]; // Array of art display configurations
}

/**
 * Array of room configurations with predefined view positions
 */
export const roomConfigurations: RoomViewConfig[] = [
  {
    id: "room2",
    name: "Home Office",
    modelPath: "/models/room/room2.glb",
    position: [0, -1, 0],
    scale: [1, 1, 1],
    rotation: [0, 0, 0],
    ambientIntensity: 0.7,
    objectsToRemove: ["Painting_03", "Frame_01", "Frame_02", "Frame_03"],
    artDisplays: [
      // Example: Add one art display for now
      {
        id: "artPiece1",
        position: [-2.7, 1.5, -5.2],
        rotation: [0, 0, 0],
        scale: 1,
      },
    ],
    viewPositions: [
      {
        id: "position-2",
        name: "Center View",
        cameraPosition: [-0.83, 0.73, 1.93],
        rotation: [-177.0, 0.9, -180.0],
        fov: 70,
        description: "View from the corner angle",
      },
      {
        id: "position-1",
        name: "Corner Angle",
        cameraPosition: [-3.27, 0.13, 2.7],
        rotation: [179.7, -39.4, 179.8],
        fov: 65,
        description: "Centered view of the room",
      },

      {
        id: "position-3",
        name: "Low Angle",
        cameraPosition: [-0.85, 0.18, 1.93],
        rotation: [179.8, 0.1, -180.0],
        fov: 65,
        description: "Looking towards the window",
      },
      {
        id: "Wide View",
        name: "Entrance",
        cameraPosition: [-1, 0.3, -0.6],
        rotation: [0, 30, 0],
        fov: 75,
        description: "Wide view of the space",
      },
      {
        id: "position-4",
        name: "Side View",
        cameraPosition: [-0.57, 0.3, -3.87],
        rotation: [0.9, 58.9, -0.8],
        fov: 75,
        description: "Side view of the space",
      },
      {
        id: "sitting-area",
        name: "Close Up",
        cameraPosition: [-3.23, 0.86, -3.9],
        rotation: [0, 1, 0],
        fov: 60,
        description: "View from the close up",
      },
    ],
  },
];
