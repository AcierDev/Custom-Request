"use client";

import { useEffect, useRef, useState } from 'react';
import { Box, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getArtSnapshot } from '@/lib/ar/artSnapshot';
import type { BlenderRoomSettings } from '@/lib/blender/blenderPackage';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

/** One export action shared by the editable and shared viewers. */
export function BlenderDownloadButton({ isMobile, wallColor, timeOfDay, lampOn }: BlenderRoomSettings & { isMobile: boolean }) {
  const [busy, setBusy] = useState(false);
  const pending = useRef(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const download = async () => {
    if (pending.current) return;
    const latest = getArtSnapshot();
    if (!latest) { toast.error('The artwork is still preparing. Please try again.'); return; }
    const snapshot = structuredClone(latest);
    pending.current = true; setBusy(true);
    try {
      const { buildBlenderPackage, BLENDER_PACKAGE_CONFIG: C } = await import('@/lib/blender/blenderPackage');
      if (!mounted.current) return;
      const packet = buildBlenderPackage(snapshot, { wallColor, timeOfDay, lampOn });
      const url = URL.createObjectURL(new Blob([JSON.stringify(packet)], { type: C.mime }));
      const link = document.createElement('a');
      try {
        link.href = url; link.download = C.filename; document.body.appendChild(link); link.click();
      } finally { link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), C.downloadRevokeMs); }
      toast.success('Render file downloaded. Ready for local Blender rendering.');
    } catch (error) {
      if (mounted.current) toast.error(error instanceof Error ? error.message : 'The render file could not be saved.');
    } finally { pending.current = false; if (mounted.current) setBusy(false); }
  };
  return <Button type="button" variant="outline" size={isMobile ? 'icon' : 'default'}
    disabled={busy} aria-busy={busy} aria-label="Download render file" title="Download a design file for local Blender rendering"
    className={cn('glass-surface text-gray-200 hover:bg-gray-900/50 hover:border-white/30 hover:text-white',
      isMobile && 'h-9 w-9 shrink-0 rounded-full border-0 ring-1 ring-white/15')}
    onClick={() => void download()}>
    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Box className="h-4 w-4" />}
    {!isMobile && (busy ? 'Preparing…' : 'Render file')}
  </Button>;
}
