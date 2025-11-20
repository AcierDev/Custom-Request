import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ColorSwatch } from "./ColorSwatch";
import { ColorSwatchProps } from "./types";

interface SortableColorSwatchProps extends ColorSwatchProps {
  id: string;
}

export function SortableColorSwatch({ id, ...props }: SortableColorSwatchProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    position: isDragging ? "relative" as const : undefined,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="touch-none"
    >
      <ColorSwatch 
        id={id} 
        {...props} 
        // Pass drag state to show visual feedback if needed
        // isDragging={isDragging} 
      />
    </div>
  );
}

