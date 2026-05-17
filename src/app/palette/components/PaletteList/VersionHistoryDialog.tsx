"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { nanoid } from "nanoid";
import { GitBranch, PenLine, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useCustomStore, type PaletteVersion } from "@/store/customStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PalettePreview } from "./PalettePreview";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🌿 GRAPH LAYOUT GEOMETRY                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Fixed card + lane sizing so node positions and SVG connector paths
// stay in sync. The graph grows wider with each branch and taller with
// each version — both axes scroll inside the dialog.
const CARD_W = 256;
const CARD_H = 160;
const COL_GAP = 56; // horizontal space between branch lanes
const ROW_GAP = 44; // vertical space between successive versions
const COL_W = CARD_W + COL_GAP;
const ROW_H = CARD_H + ROW_GAP;
const PAD = 24; // canvas padding so edges/cards don't touch the frame
const ELBOW_R = 16; // rounded-corner radius for branch connectors

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface GraphNode {
  version: PaletteVersion;
  row: number; // chronological index (oldest = 0, at the top)
  col: number; // branch lane
  parentId: string | null; // effective parent (falls back for legacy data)
}

// Assign every version a (row, col): row is chronological order, col is
// its branch lane. The first child to continue a parent keeps the
// parent's lane; every later child opens a fresh lane to the right.
// Lanes are never reclaimed — the user wants branches laid out side by
// side even if that makes the graph wider.
function buildGraph(versions: PaletteVersion[]): {
  nodes: GraphNode[];
  cols: number;
  rows: number;
} {
  const ids = new Set(versions.map((v) => v.id));
  const colById = new Map<string, number>();
  const rowById = new Map<string, number>();
  const laneContinued = new Set<string>();
  let maxCol = 0;
  let maxRow = 0;

  const nodes: GraphNode[] = versions.map((version, idx) => {
    // Legacy versions saved before branching have no parentId — chain
    // them to the previous version so they render as one straight line.
    const parentId =
      version.parentId && ids.has(version.parentId)
        ? version.parentId
        : idx > 0
          ? versions[idx - 1].id
          : null;

    // Row is tree depth, not chronological index: a branch sits right
    // beside the version it forked from instead of being pushed all the
    // way down to its creation order, so there's no empty scroll space.
    const row =
      parentId === null ? 0 : (rowById.get(parentId) ?? -1) + 1;

    let col: number;
    if (parentId === null) {
      col = 0;
    } else if (!laneContinued.has(parentId)) {
      col = colById.get(parentId) ?? 0;
      laneContinued.add(parentId);
    } else {
      col = ++maxCol;
    }
    colById.set(version.id, col);
    rowById.set(version.id, row);
    if (col > maxCol) maxCol = col;
    if (row > maxRow) maxRow = row;
    return { version, row, col, parentId };
  });

  return { nodes, cols: maxCol + 1, rows: maxRow + 1 };
}

/**
 * Version history for a single saved palette, rendered as a git-style
 * branch graph: chronological top→bottom, each branch in its own lane
 * with SVG connectors from every version to its parent. Opened from a
 * palette card via `historyPaletteId` so it needs no prop-drilling.
 */
export function VersionHistoryDialog() {
  const historyPaletteId = useCustomStore((s) => s.historyPaletteId);
  const setHistoryPaletteId = useCustomStore((s) => s.setHistoryPaletteId);
  const palette = useCustomStore((s) =>
    s.savedPalettes.find((p) => p.id === s.historyPaletteId)
  );
  const renamePaletteVersion = useCustomStore((s) => s.renamePaletteVersion);
  const restorePaletteVersion = useCustomStore((s) => s.restorePaletteVersion);
  const deletePaletteVersion = useCustomStore((s) => s.deletePaletteVersion);
  const setCustomPalette = useCustomStore((s) => s.setCustomPalette);
  const setEditingPaletteId = useCustomStore((s) => s.setEditingPaletteId);
  const setActiveTab = useCustomStore((s) => s.setActiveTab);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Chronological order (creation order = append order in the store).
  const ordered = useMemo(
    () => palette?.versions ?? [],
    [palette?.versions]
  );
  const { nodes, cols, rows } = useMemo(
    () => buildGraph(ordered),
    [ordered]
  );

  if (!historyPaletteId || !palette) return null;

  const currentVersionId =
    palette.currentVersionId ?? ordered[ordered.length - 1]?.id ?? null;
  const posById = new Map(nodes.map((n) => [n.version.id, n]));

  // The tip of a lane is its highest-row node. Branching from a tip is
  // identical to just editing it (the branch would have no siblings), so
  // we only offer Branch on versions that already have a continuation.
  const tipByCol = new Map<number, string>();
  for (const n of nodes) {
    const tip = tipByCol.get(n.col);
    if (tip == null || n.row > (posById.get(tip)?.row ?? -1)) {
      tipByCol.set(n.col, n.version.id);
    }
  }

  const canvasW = cols * COL_W - COL_GAP + PAD * 2;
  const canvasH = rows * ROW_H - ROW_GAP + PAD * 2;
  const nodeX = (col: number) => PAD + col * COL_W;
  const nodeY = (row: number) => PAD + row * ROW_H;
  const centerX = (col: number) => nodeX(col) + CARD_W / 2;

  const close = () => {
    setRenamingId(null);
    setHistoryPaletteId(null);
  };

  const handleEdit = (version: PaletteVersion) => {
    // Load this version's colors into the editor, replacing whatever was
    // there (fresh ids so nothing collides) and jump to the editor.
    const colors = version.colors.map((c) => ({
      id: nanoid(),
      hex: c.hex,
      name: c.name ?? "",
    }));
    setCustomPalette(colors);
    // Stay tied to this saved palette so saving stacks a new version
    // instead of creating an entirely new palette.
    setEditingPaletteId(palette.id);
    setActiveTab("create");
    close();
    toast.success(`Editing "${palette.name}"`);
  };

  const handleBranch = (versionId: string) => {
    restorePaletteVersion(palette.id, versionId);
    toast.success("Created a new branch from this version");
  };

  const commitRename = () => {
    if (renamingId) {
      renamePaletteVersion(palette.id, renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const handleDelete = (versionId: string) => {
    if ((palette.versions?.length ?? 0) <= 1) {
      toast.error("A design must keep at least one version");
      return;
    }
    deletePaletteVersion(palette.id, versionId);
    toast.success("Version deleted");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={close}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="mx-4 flex max-h-[88vh] w-full max-w-[min(95vw,1200px)] flex-col overflow-hidden rounded-lg border border-white/10 bg-gray-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div>
            <h3 className="text-base font-semibold text-white">
              {palette.name} — version graph
            </h3>
            <p className="text-xs text-slate-400">
              {ordered.length}{" "}
              {ordered.length === 1 ? "version" : "versions"} · {cols}{" "}
              {cols === 1 ? "branch" : "branches"} · nothing is ever
              deleted automatically
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={close}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrolls on both axes — the graph grows down per version and
            right per branch. */}
        <div className="overflow-auto p-2">
          <div
            className="relative"
            style={{ width: canvasW, height: canvasH }}
          >
            <svg
              className="absolute inset-0 pointer-events-none"
              width={canvasW}
              height={canvasH}
            >
              {nodes.map((n) => {
                if (!n.parentId) return null;
                const p = posById.get(n.parentId);
                if (!p) return null;
                const sx = centerX(p.col);
                const sy = nodeY(p.row) + CARD_H;
                const ex = centerX(n.col);
                const ey = nodeY(n.row);
                const isBranch = n.col !== p.col;
                // Same lane: a straight drop. Branch: route as a rounded
                // orthogonal connector — down out of the parent, across the
                // empty gap strip just below it, then straight down the
                // child's own (empty) lane. This never crosses a card.
                let d: string;
                if (!isBranch) {
                  d = `M ${sx} ${sy} L ${ex} ${ey}`;
                } else {
                  const dir = ex > sx ? 1 : -1;
                  const midY = sy + ROW_GAP / 2;
                  d =
                    `M ${sx} ${sy} ` +
                    `L ${sx} ${midY - ELBOW_R} ` +
                    `Q ${sx} ${midY} ${sx + dir * ELBOW_R} ${midY} ` +
                    `L ${ex - dir * ELBOW_R} ${midY} ` +
                    `Q ${ex} ${midY} ${ex} ${midY + ELBOW_R} ` +
                    `L ${ex} ${ey}`;
                }
                return (
                  <path
                    key={`edge-${n.version.id}`}
                    d={d}
                    fill="none"
                    stroke={isBranch ? "#a855f7" : "#475569"}
                    strokeWidth={2}
                  />
                );
              })}
            </svg>

            {nodes.map((n) => {
              const v = n.version;
              const isCurrent = v.id === currentVersionId;
              const isTip = tipByCol.get(n.col) === v.id;
              return (
                <div
                  key={v.id}
                  className={`absolute rounded-lg border bg-gray-800/60 p-3 ${
                    isCurrent
                      ? "border-green-400/50 ring-1 ring-green-400/30"
                      : "border-white/10"
                  }`}
                  style={{
                    left: nodeX(n.col),
                    top: nodeY(n.row),
                    width: CARD_W,
                    height: CARD_H,
                  }}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    {renamingId === v.id ? (
                      <Input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        className="h-7 flex-1 border-white/10 bg-gray-900/60 text-sm"
                      />
                    ) : (
                      <span
                        title="Click to rename"
                        onClick={() => {
                          setRenamingId(v.id);
                          setRenameValue(v.label || "");
                        }}
                        className="-mx-1 cursor-text truncate rounded px-1 text-sm font-semibold text-white hover:bg-white/10"
                      >
                        {(v.label || "Untitled version").replace(
                          /^Version (\d+)$/,
                          "v$1"
                        )}
                      </span>
                    )}
                    {isCurrent && (
                      <span className="shrink-0 rounded-full bg-green-900/40 px-2 py-0.5 text-[10px] text-green-300 ring-1 ring-green-400/30">
                        Current
                      </span>
                    )}
                  </div>

                  {v.branchedFrom && (
                    <div className="mb-1 flex">
                      <span className="rounded-full bg-purple-900/40 px-2 py-0.5 text-[10px] text-purple-300 ring-1 ring-purple-400/30">
                        branched from {v.branchedFrom}
                      </span>
                    </div>
                  )}

                  <PalettePreview colors={v.colors} />

                  <div className="mt-1.5 text-[10px] text-slate-400">
                    {formatDate(v.createdAt)} · {v.colors.length} colors
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 px-2 text-xs"
                      onClick={() => handleEdit(v)}
                    >
                      <PenLine className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    {!isTip && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => handleBranch(v.id)}
                      >
                        <GitBranch className="h-3.5 w-3.5" />
                        Branch
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-red-300 hover:bg-red-500/10 hover:text-red-200"
                      title="Delete"
                      onClick={() => handleDelete(v.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
