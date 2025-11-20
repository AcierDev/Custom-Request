import { CustomColor } from "@/store/customStore";

// Types for PaletteManager components

export interface ColorInfo {
  hex: string;
  name?: string;
}

// Color swatch component props
export interface ColorSwatchProps {
  id?: string;
  color: string;
  name?: string;
  index: number;
  isSelected: boolean;
  showBlendHint?: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
}

// Add color button component props
export interface AddColorButtonProps {
  onColorAdd: (hex: string) => void;
  isEmpty?: boolean;
}

// Blending Guide component props
export interface BlendingGuideProps {
  onDismiss: () => void;
}

// Color Harmony Generator component props
export interface ColorHarmonyGeneratorProps {
  onAddColors: (colors: string[]) => void;
}

export interface HarmonyOption {
  id: string;
  name: string;
  description: string;
  generate: (color: string, count?: number) => string[];
}
