import type { ArtSnapshot } from "../ar/artSnapshot.ts";
import {
  generateStepFile,
  type GeneratedStepFile,
  type StepDownloadOptions,
} from "../step/exportStep.ts";
import { FUSION_PACKAGE_CONFIG } from "./fusionPackageConfig.ts";
import type {
  FusionPackageInput,
  FusionTextureBuildResult,
  GeneratedFusionPackage,
} from "./fusionPackageTypes.ts";

export interface FusionPackageDownloadOptions {
  now?: () => Date;
  generateStepFile?: (
    snapshot: ArtSnapshot,
    options: StepDownloadOptions,
  ) => Promise<GeneratedStepFile>;
  createTextureAssets?: (
    snapshot: ArtSnapshot,
  ) => Promise<FusionTextureBuildResult>;
  buildPackage?: (input: FusionPackageInput) => GeneratedFusionPackage;
  createObjectUrl?: (blob: Blob) => string;
  revokeObjectUrl?: (url: string) => void;
  download?: (url: string, filename: string) => void;
}

const HIDDEN_DISPLAY = "none";

const triggerDownload = (url: string, filename: string): void => {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = HIDDEN_DISPLAY;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
};

const defaultCreateTextureAssets = async (
  snapshot: ArtSnapshot,
): Promise<FusionTextureBuildResult> => {
  const { createFusionTextureAssets } = await import(
    "./fusionTextures.ts"
  );
  return createFusionTextureAssets(snapshot);
};

const loadPackageBuilder = async (): Promise<
  (input: FusionPackageInput) => GeneratedFusionPackage
> => {
  const { buildFusionPackage } = await import("./fusionPackage.ts");
  return buildFusionPackage;
};

export async function generateFusionPackageDownload(
  snapshot: ArtSnapshot,
  options: FusionPackageDownloadOptions = {},
): Promise<void> {
  const stepFile = await (
    options.generateStepFile ?? generateStepFile
  )(snapshot, {
    now: options.now,
  });
  const textures = await (
    options.createTextureAssets ?? defaultCreateTextureAssets
  )(snapshot);
  const buildPackage =
    options.buildPackage ?? (await loadPackageBuilder());
  const packageResult = buildPackage({
    snapshot,
    stepFile,
    textures,
  });
  const createObjectUrl =
    options.createObjectUrl ?? URL.createObjectURL.bind(URL);
  const revokeObjectUrl =
    options.revokeObjectUrl ?? URL.revokeObjectURL.bind(URL);
  const download = options.download ?? triggerDownload;
  let objectUrl: string | null = null;

  try {
    const bytes = packageResult.bytes.slice().buffer as ArrayBuffer;
    const blob = new Blob([bytes], {
      type: FUSION_PACKAGE_CONFIG.mediaType,
    });
    objectUrl = createObjectUrl(blob);
    download(objectUrl, packageResult.filename);
  } finally {
    if (objectUrl) revokeObjectUrl(objectUrl);
  }
}
