import type { GeneratedStepFile } from "../step/exportStep.ts";
import type { ArtSnapshot } from "../ar/artSnapshot.ts";

export interface FusionTextureAsset {
  filename: string;
  bytes: Uint8Array;
}

export interface FusionTextureBuildResult {
  assets: FusionTextureAsset[];
  backboardTextureFilename: string | null;
  squareTextureFilenames: Array<string | null>;
}

export interface FusionAppearanceMapping {
  componentName: string;
  colorHex: string;
  textureFilename: string | null;
}

export interface FusionDesignManifest {
  schemaVersion: number;
  description: string;
  exportedAtIso: string;
  stepFilename: string;
  backboard: FusionAppearanceMapping;
  squares: FusionAppearanceMapping[];
}

export interface FusionPackageInput {
  snapshot: ArtSnapshot;
  stepFile: GeneratedStepFile;
  textures: FusionTextureBuildResult;
}

export interface GeneratedFusionPackage {
  filename: string;
  bytes: Uint8Array;
}
