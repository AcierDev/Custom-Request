"use client";

import { useCallback, useMemo } from "react";
import { History, Redo2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCustomStore } from "@/store/customStore";
import { cn } from "@/lib/utils";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ↩️ PATTERN HISTORY                                                   ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const EMPTY_ITEM_COUNT = 0;
const SINGULAR_ITEM_COUNT = 1;
const PATTERN_HISTORY_VISIBLE_ENTRY_LIMIT = 3;

export function PatternHistoryControls() {
  const patternUndoStack = useCustomStore((state) => state.patternUndoStack);
  const patternRedoStack = useCustomStore((state) => state.patternRedoStack);
  const undoPatternEdit = useCustomStore((state) => state.undoPatternEdit);
  const redoPatternEdit = useCustomStore((state) => state.redoPatternEdit);

  const recentChanges = useMemo(
    () =>
      patternUndoStack.slice(-PATTERN_HISTORY_VISIBLE_ENTRY_LIMIT).reverse(),
    [patternUndoStack]
  );

  const handleUndo = useCallback(() => {
    const latestChange =
      patternUndoStack[patternUndoStack.length - SINGULAR_ITEM_COUNT];
    if (latestChange && undoPatternEdit()) {
      toast.success(`Undid: ${latestChange.label}`);
    }
  }, [patternUndoStack, undoPatternEdit]);

  const handleRedo = useCallback(() => {
    const latestUndoneChange =
      patternRedoStack[patternRedoStack.length - SINGULAR_ITEM_COUNT];
    if (latestUndoneChange && redoPatternEdit()) {
      toast.success(`Redid: ${latestUndoneChange.label}`);
    }
  }, [patternRedoStack, redoPatternEdit]);

  return (
    <div className="space-y-2 border-t border-white/10 pt-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-300">
          <History className="h-3.5 w-3.5 text-indigo-300" />
          Recent changes
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7 border-white/15 bg-gray-900/40 text-slate-200"
            disabled={patternUndoStack.length === EMPTY_ITEM_COUNT}
            onClick={handleUndo}
            aria-label="Undo last pattern change"
            title="Undo last pattern change"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7 border-white/15 bg-gray-900/40 text-slate-200"
            disabled={patternRedoStack.length === EMPTY_ITEM_COUNT}
            onClick={handleRedo}
            aria-label="Redo last pattern change"
            title="Redo last pattern change"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {recentChanges.length > EMPTY_ITEM_COUNT && (
        <ol className="space-y-1" aria-label="Recent pattern changes">
          {recentChanges.map((change, index) => (
            <li
              key={change.id}
              className="flex items-start gap-2 rounded-md bg-gray-900/40 px-2 py-1.5 text-[0.7rem] text-slate-300"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                  index === EMPTY_ITEM_COUNT
                    ? "bg-indigo-300"
                    : "bg-slate-600"
                )}
              />
              <span>{change.label}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
