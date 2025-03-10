"use client";

import { useCustomStore } from "@/store/customStore";
import { useRouter } from "next/navigation";
import { FolderSection } from "./FolderSection";

export function DesignList() {
  const router = useRouter();
  const { loadDesignForEditing, deleteDesign, applyDesign } = useCustomStore();

  const handleEdit = (id: string) => {
    // Load the design for editing and navigate to the design page
    loadDesignForEditing(id);
    router.push("/design");
  };

  const handleDelete = (id: string) => {
    deleteDesign(id);
  };

  const handleVisualize = (id: string) => {
    // Apply the design and navigate to the design page
    applyDesign(id);
    router.push("/design");
  };

  const handleOrder = (id: string) => {
    // Apply the design and then initiate the order process
    applyDesign(id);
    router.push("/order");
  };

  return (
    <div className="space-y-6">
      <FolderSection
        onEdit={handleEdit}
        onDelete={handleDelete}
        onVisualize={handleVisualize}
        onOrder={handleOrder}
      />
    </div>
  );
}
