"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Loader2, Palette } from "lucide-react";
type ColorBreakdownDesign = {
  index: number;
  label: string | null;
  extraPercent?: number;
};

type ColorBreakdownItem = {
  hex: string;
  name: string | null;
  designCount: number;
  designs: ColorBreakdownDesign[];
};

type ByDesignItem = {
  index: number;
  label: string | null;
  colorCount: number;
  colors: Array< { hex: string; name: string | null }>;
};

type ColorBreakdown = {
  totalUniqueColors: number;
  totalColorSlots: number;
  byColor: ColorBreakdownItem[];
  byDesign: ByDesignItem[];
};

type ApiResponse = {
  setId: string;
  setUrl: string;
  colorBreakdown: ColorBreakdown;
  error?: string;
};

export default function SetColorBreakdownPage() {
  const params = useParams();
  const setId = params.setId as string;
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchBreakdown = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/shared-design-sets?id=${encodeURIComponent(setId)}&breakdown=colors`
        );
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || "Failed to load set");
          setData(null);
          return;
        }
        if (!json.colorBreakdown) {
          setError("Color breakdown not available");
          setData(null);
          return;
        }
        setData({
          setId: json.setId,
          setUrl: json.setUrl,
          colorBreakdown: json.colorBreakdown,
        });
      } catch (e) {
        if (!cancelled) {
          setError("Failed to load color breakdown");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchBreakdown();
    return () => {
      cancelled = true;
    };
  }, [setId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading color breakdown…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full p-6">
          <p className="text-destructive mb-4">{error ?? "Set not found"}</p>
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  const { setUrl, colorBreakdown } = data;
  const { byColor, byDesign, totalUniqueColors, totalColorSlots } =
    colorBreakdown;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-6 px-4">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-6"
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <a
              href={setUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              View set in Everwood Viewer
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <header>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Palette className="h-6 w-6 text-muted-foreground" />
              Color breakdown
            </h1>
            <p className="text-muted-foreground mt-1">
              Set <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{data.setId}</code>
              {" · "}
              {totalUniqueColors} unique color{totalUniqueColors !== 1 ? "s" : ""}
              {" · "}
              {totalColorSlots} total color slot{totalColorSlots !== 1 ? "s" : ""} across {byDesign.length} design{byDesign.length !== 1 ? "s" : ""}
            </p>
          </header>

          <section>
            <h2 className="text-lg font-medium mb-3">By color</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {byColor.map((item, i) => (
                <motion.li
                  key={item.hex}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="p-3 flex flex-wrap items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-md border border-border shrink-0"
                      style={{ backgroundColor: item.hex }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="text-sm bg-muted rounded px-1.5 py-0.5">
                          {item.hex}
                        </code>
                        {item.name && (
                          <span className="text-sm text-muted-foreground">
                            {item.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Used in {item.designCount} design
                        {item.designCount !== 1 ? "s" : ""}:{" "}
                        {item.designs
                          .map((d) => d.label ?? `Design ${d.index + 1}`)
                          .join(", ")}
                        {item.designs.some((d) => d.extraPercent && d.extraPercent !== 0) && (
                          <>
                            {" "}
                            (
                            {item.designs
                              .filter((d) => d.extraPercent && d.extraPercent !== 0)
                              .map((d) => `${d.label ?? `#${d.index + 1}`}: +${d.extraPercent}%`)
                              .join("; ")}
                            )
                          </>
                        )}
                      </p>
                    </div>
                    <Badge variant="secondary">{item.designCount}</Badge>
                  </Card>
                </motion.li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-3">By design</h2>
            <ul className="space-y-4">
              {byDesign.map((design, i) => (
                <motion.li
                  key={design.index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (byColor.length + i) * 0.03 }}
                >
                  <Card className="p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="font-medium">
                        {design.label ?? `Design ${design.index + 1}`}
                      </span>
                      <Badge variant="outline">{design.colorCount} colors</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {design.colors.map((c) => (
                        <div
                          key={c.hex}
                          className="flex items-center gap-1.5 rounded-md border border-border overflow-hidden bg-muted/50"
                        >
                          <div
                            className="h-8 w-12 shrink-0"
                            style={{ backgroundColor: c.hex }}
                          />
                          <div className="pr-2 py-1">
                            <span className="font-mono text-xs">
                              {c.hex}
                            </span>
                            {c.name && (
                              <span className="text-xs text-muted-foreground ml-1">
                                {c.name}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </motion.li>
              ))}
            </ul>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
