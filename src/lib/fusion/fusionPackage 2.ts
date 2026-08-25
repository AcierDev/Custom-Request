import { strToU8, zipSync } from "fflate";
import { buildStepModelPlan } from "../step/stepModel.ts";
import {
  FUSION_APPEARANCE_SCRIPT,
  FUSION_SCRIPT_MANIFEST,
  createFusionReadme,
} from "./fusionAppearanceScript.ts";
import { FUSION_PACKAGE_CONFIG } from "./fusionPackageConfig.ts";
import type {
  FusionDesignManifest,
  FusionPackageInput,
  FusionTextureBuildResult,
  GeneratedFusionPackage,
} from "./fusionPackageTypes.ts";

const makePackageFilename = (filenameStamp: string): string =>
  `${FUSION_PACKAGE_CONFIG.filenamePrefix}-${filenameStamp}${FUSION_PACKAGE_CONFIG.fileExtension}`;

const joinArchivePath = (...parts: string[]): string => parts.join("/");

export function createFusionManifest(
  snapshot: FusionPackageInput["snapshot"],
  stepFile: FusionPackageInput["stepFile"],
  textures: FusionTextureBuildResult,
): FusionDesignManifest {
  const visibleInstances = snapshot.instances.filter(
    (instance) => !instance.hidden,
  );
  if (
    textures.squareTextureFilenames.length !== visibleInstances.length
  ) {
    throw new Error(
      "Fusion texture mapping does not match the visible square count.",
    );
  }

  const plan = buildStepModelPlan(snapshot);
  return {
    schemaVersion: FUSION_PACKAGE_CONFIG.manifestSchemaVersion,
    description: stepFile.description,
    exportedAtIso: stepFile.exportedAtIso,
    stepFilename: stepFile.filename,
    backboard: {
      componentName: plan.backboard.name,
      colorHex: plan.backboard.colorHex,
      textureFilename: textures.backboardTextureFilename,
    },
    squares: plan.squares.children.map((square, index) => ({
      componentName: square.name,
      colorHex: square.colorHex,
      textureFilename: textures.squareTextureFilenames[index],
    })),
  };
}

export function buildFusionPackage({
  snapshot,
  stepFile,
  textures,
}: FusionPackageInput): GeneratedFusionPackage {
  const manifest = createFusionManifest(snapshot, stepFile, textures);
  const scriptDirectory = FUSION_PACKAGE_CONFIG.scriptDirectory;
  const entries: Record<string, Uint8Array> = {
    [stepFile.filename]: new Uint8Array(stepFile.buffer),
    [FUSION_PACKAGE_CONFIG.readmeFilename]: strToU8(
      createFusionReadme(stepFile.filename),
    ),
    [joinArchivePath(
      scriptDirectory,
      FUSION_PACKAGE_CONFIG.scriptFilename,
    )]: strToU8(FUSION_APPEARANCE_SCRIPT),
    [joinArchivePath(
      scriptDirectory,
      FUSION_PACKAGE_CONFIG.scriptManifestFilename,
    )]: strToU8(FUSION_SCRIPT_MANIFEST),
    [joinArchivePath(
      scriptDirectory,
      FUSION_PACKAGE_CONFIG.designManifestFilename,
    )]: strToU8(
      JSON.stringify(
        manifest,
        null,
        FUSION_PACKAGE_CONFIG.jsonIndentSpaces,
      ),
    ),
  };

  for (const asset of textures.assets) {
    entries[joinArchivePath(scriptDirectory, asset.filename)] =
      asset.bytes;
  }

  return {
    filename: makePackageFilename(stepFile.filenameStamp),
    bytes: zipSync(entries, {
      level: FUSION_PACKAGE_CONFIG.zipCompressionLevel,
    }),
  };
}

export type {
  FusionDesignManifest,
  FusionPackageInput,
  FusionTextureBuildResult,
  GeneratedFusionPackage,
} from "./fusionPackageTypes.ts";
