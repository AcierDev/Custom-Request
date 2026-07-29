import type { ArtSnapshot } from "../ar/artSnapshot.ts";
import { buildStepModelPlan } from "../step/stepModel.ts";
import { GRAIN_ATLAS } from "../../components/preview/woodStyles.ts";
import { FUSION_PACKAGE_CONFIG } from "./fusionPackageConfig.ts";
import type {
  FusionTextureAsset,
  FusionTextureBuildResult,
} from "./fusionPackageTypes.ts";

export type FusionTextureMode = "square" | "backboard";

export interface SquareTextureIdentity {
  color: string;
  grainIndex: number;
}

export interface FusionTextureDependencies {
  loadImage?: (url: string) => Promise<HTMLImageElement>;
  createCanvas?: (width: number, height: number) => HTMLCanvasElement;
  encodePng?: (canvas: HTMLCanvasElement) => Promise<Uint8Array>;
}

const HEX_COLOR_PATTERN = /^#[\dA-F]{6}$/;
const HEX_COLOR_PREFIX = "#";
const FILE_COLOR_PREFIX_LENGTH = 1;
const EMPTY_TEXTURE_COUNT = 0;

const normalizeColor = (color: string): string => {
  const normalized = color.trim().toUpperCase();
  if (!HEX_COLOR_PATTERN.test(normalized)) {
    throw new Error(`Fusion texture received an invalid color: ${color}`);
  }
  return normalized;
};

const clampColor = (value: number): number =>
  Math.min(
    FUSION_PACKAGE_CONFIG.maximumColorChannel,
    Math.max(FUSION_PACKAGE_CONFIG.minimumColorChannel, value),
  );

const srgbToLinear = (value: number): number => {
  const clamped = clampColor(value);
  return clamped <= FUSION_PACKAGE_CONFIG.srgbToLinearThreshold
    ? clamped / FUSION_PACKAGE_CONFIG.srgbLinearDivisor
    : Math.pow(
        (clamped + FUSION_PACKAGE_CONFIG.srgbOffset) /
          FUSION_PACKAGE_CONFIG.srgbScale,
        FUSION_PACKAGE_CONFIG.srgbExponent,
      );
};

const linearToSrgb = (value: number): number => {
  const clamped = clampColor(value);
  return clamped <= FUSION_PACKAGE_CONFIG.linearToSrgbThreshold
    ? clamped * FUSION_PACKAGE_CONFIG.srgbLinearDivisor
    : FUSION_PACKAGE_CONFIG.srgbScale *
        Math.pow(
          clamped,
          FUSION_PACKAGE_CONFIG.maximumColorChannel /
            FUSION_PACKAGE_CONFIG.srgbExponent,
        ) -
        FUSION_PACKAGE_CONFIG.srgbOffset;
};

const parseColorChannels = (color: string): readonly number[] => {
  const normalized = normalizeColor(color);
  return [
    FUSION_PACKAGE_CONFIG.redHexStartIndex,
    FUSION_PACKAGE_CONFIG.greenHexStartIndex,
    FUSION_PACKAGE_CONFIG.blueHexStartIndex,
  ].map((startIndex) =>
    srgbToLinear(
      Number.parseInt(
        normalized.slice(
          startIndex,
          startIndex + FUSION_PACKAGE_CONFIG.hexChannelLength,
        ),
        16,
      ) / FUSION_PACKAGE_CONFIG.colorChannelMax,
    ),
  );
};

export function tintWoodPixels(
  pixels: Uint8ClampedArray,
  color: string,
  mode: FusionTextureMode,
): Uint8ClampedArray {
  const result = pixels.slice();
  const baseChannels = parseColorChannels(color);

  for (
    let pixelIndex = 0;
    pixelIndex < result.length;
    pixelIndex += FUSION_PACKAGE_CONFIG.colorChannelCount
  ) {
    for (
      let channelIndex = 0;
      channelIndex < FUSION_PACKAGE_CONFIG.rgbChannelCount;
      channelIndex += 1
    ) {
      const sourceLinear = srgbToLinear(
        result[pixelIndex + channelIndex] /
          FUSION_PACKAGE_CONFIG.colorChannelMax,
      );
      const grainFactor =
        mode === "square"
          ? ((FUSION_PACKAGE_CONFIG.maximumColorChannel -
              GRAIN_ATLAS.opacity) +
              GRAIN_ATLAS.opacity * sourceLinear) *
            GRAIN_ATLAS.brightness
          : sourceLinear;
      const outputSrgb = linearToSrgb(
        baseChannels[channelIndex] * grainFactor,
      );
      result[pixelIndex + channelIndex] = Math.round(
        outputSrgb * FUSION_PACKAGE_CONFIG.colorChannelMax,
      );
    }
  }

  return result;
}

const validateGrainIndex = (grainIndex: number): void => {
  if (
    !Number.isInteger(grainIndex) ||
    grainIndex < EMPTY_TEXTURE_COUNT ||
    grainIndex >= GRAIN_ATLAS.count
  ) {
    throw new Error(`Fusion texture received an invalid grain index: ${grainIndex}`);
  }
};

export function getSquareTextureKey({
  color,
  grainIndex,
}: SquareTextureIdentity): string {
  validateGrainIndex(grainIndex);
  return `${normalizeColor(color)}:${grainIndex}`;
}

const getSquareTextureFilename = ({
  color,
  grainIndex,
}: SquareTextureIdentity): string => {
  validateGrainIndex(grainIndex);
  const colorToken = normalizeColor(color)
    .slice(FILE_COLOR_PREFIX_LENGTH)
    .toLowerCase();
  const grainToken = String(grainIndex).padStart(
    FUSION_PACKAGE_CONFIG.grainIndexWidth,
    "0",
  );
  return `${FUSION_PACKAGE_CONFIG.textureDirectory}/${FUSION_PACKAGE_CONFIG.squareTextureFilenamePrefix}-${colorToken}-${FUSION_PACKAGE_CONFIG.grainTextureFilenameSegment}-${grainToken}${FUSION_PACKAGE_CONFIG.textureFileExtension}`;
};

const getBackboardTextureFilename = (color: string): string => {
  const colorToken = normalizeColor(color)
    .replace(HEX_COLOR_PREFIX, "")
    .toLowerCase();
  return `${FUSION_PACKAGE_CONFIG.textureDirectory}/${FUSION_PACKAGE_CONFIG.backboardTextureFilenamePrefix}-${colorToken}${FUSION_PACKAGE_CONFIG.textureFileExtension}`;
};

const defaultLoadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error(`Unable to load Fusion texture source: ${url}`));
    image.src = url;
  });

const defaultCreateCanvas = (
  width: number,
  height: number,
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const defaultEncodePng = (
  canvas: HTMLCanvasElement,
): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error(FUSION_PACKAGE_CONFIG.defaultErrorMessage));
        return;
      }
      void blob.arrayBuffer().then(
        (buffer) => resolve(new Uint8Array(buffer)),
        reject,
      );
    }, FUSION_PACKAGE_CONFIG.textureMediaType);
  });

const getImageWidth = (image: HTMLImageElement): number =>
  image.naturalWidth || image.width;

const getImageHeight = (image: HTMLImageElement): number =>
  image.naturalHeight || image.height;

const renderTexture = async (
  image: HTMLImageElement,
  color: string,
  mode: FusionTextureMode,
  dependencies: Required<
    Pick<FusionTextureDependencies, "createCanvas" | "encodePng">
  >,
  source?: {
    x: number;
    y: number;
    width: number;
    height: number;
  },
): Promise<Uint8Array> => {
  const textureSize = FUSION_PACKAGE_CONFIG.textureSizePixels;
  const canvas = dependencies.createCanvas(textureSize, textureSize);
  const context = canvas.getContext("2d", {
    willReadFrequently: true,
  });
  if (!context) {
    throw new Error(FUSION_PACKAGE_CONFIG.defaultErrorMessage);
  }

  const crop = source ?? {
    x: 0,
    y: 0,
    width: getImageWidth(image),
    height: getImageHeight(image),
  };
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    textureSize,
    textureSize,
  );
  const imageData = context.getImageData(
    0,
    0,
    textureSize,
    textureSize,
  );
  imageData.data.set(tintWoodPixels(imageData.data, color, mode));
  context.putImageData(imageData, 0, 0);
  return dependencies.encodePng(canvas);
};

const getAtlasCrop = (
  image: HTMLImageElement,
  grainIndex: number,
): { x: number; y: number; width: number; height: number } => {
  validateGrainIndex(grainIndex);
  const cellWidth = getImageWidth(image) / GRAIN_ATLAS.grid;
  const cellHeight = getImageHeight(image) / GRAIN_ATLAS.grid;
  const sample = GRAIN_ATLAS.cellInset / GRAIN_ATLAS.zoom;
  const width = cellWidth * sample;
  const height = cellHeight * sample;
  const column = grainIndex % GRAIN_ATLAS.grid;
  const row = Math.floor(grainIndex / GRAIN_ATLAS.grid);

  return {
    x: column * cellWidth + (cellWidth - width) / 2,
    y: row * cellHeight + (cellHeight - height) / 2,
    width,
    height,
  };
};

export async function createFusionTextureAssets(
  snapshot: ArtSnapshot,
  options: FusionTextureDependencies = {},
): Promise<FusionTextureBuildResult> {
  const visibleInstances = snapshot.instances.filter(
    (instance) => !instance.hidden,
  );
  if (!snapshot.showWoodGrain) {
    return {
      assets: [],
      backboardTextureFilename: null,
      squareTextureFilenames: visibleInstances.map(() => null),
    };
  }

  const loadImage = options.loadImage ?? defaultLoadImage;
  const dependencies = {
    createCanvas: options.createCanvas ?? defaultCreateCanvas,
    encodePng: options.encodePng ?? defaultEncodePng,
  };
  const [grainAtlas, plywood] = await Promise.all([
    loadImage(FUSION_PACKAGE_CONFIG.grainAtlasUrl),
    loadImage(FUSION_PACKAGE_CONFIG.plywoodTextureUrl),
  ]);
  const plan = buildStepModelPlan(snapshot);
  const assets: FusionTextureAsset[] = [];
  const squareTextureByKey = new Map<string, string>();
  const squareTextureFilenames: string[] = [];

  for (let index = 0; index < plan.squares.children.length; index += 1) {
    const square = plan.squares.children[index];
    const instance = visibleInstances[index];
    const identity = {
      color: square.colorHex,
      grainIndex: instance.grainIndex,
    };
    const key = getSquareTextureKey(identity);
    let filename = squareTextureByKey.get(key);
    if (!filename) {
      filename = getSquareTextureFilename(identity);
      assets.push({
        filename,
        bytes: await renderTexture(
          grainAtlas,
          square.colorHex,
          "square",
          dependencies,
          getAtlasCrop(grainAtlas, instance.grainIndex),
        ),
      });
      squareTextureByKey.set(key, filename);
    }
    squareTextureFilenames.push(filename);
  }

  const backboardTextureFilename = getBackboardTextureFilename(
    plan.backboard.colorHex,
  );
  assets.push({
    filename: backboardTextureFilename,
    bytes: await renderTexture(
      plywood,
      plan.backboard.colorHex,
      "backboard",
      dependencies,
    ),
  });

  return {
    assets,
    backboardTextureFilename,
    squareTextureFilenames,
  };
}
