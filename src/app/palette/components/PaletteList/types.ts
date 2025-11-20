import { SavedPalette } from "@/store/customStore";

// PalettePreview component props
export interface PalettePreviewProps {
  colors: Array<{ id?: string; hex: string; name?: string }>;
}

// PaletteCard component props
export interface PaletteCardProps {
  palette: SavedPalette;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onVisualize: (palette: SavedPalette) => void;
  onOrder: (palette: SavedPalette) => void;
  isEditing: boolean;
  onMove?: () => void;
  inFolder?: boolean;
}
