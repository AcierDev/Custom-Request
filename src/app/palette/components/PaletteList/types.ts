import { SavedPalette } from "@/store/customStore";

// PalettePreview component props
export interface PalettePreviewProps {
  colors: Array<{ hex: string; name?: string }>;
}

// PaletteCard component props
export interface PaletteCardProps {
  palette: SavedPalette;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onApply: (palette: SavedPalette) => void;
  isEditing: boolean;
}
