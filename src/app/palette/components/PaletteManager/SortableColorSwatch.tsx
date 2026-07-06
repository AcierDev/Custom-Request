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
      // touch-manipulation (not touch-none) so swipes still scroll the
      // page on mobile; the TouchSensor's long-press starts a drag.
      className="flex-1 min-w-0 touch-manipulation select-none"
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

