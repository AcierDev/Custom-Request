import { Color, mix as spectralMix } from "spectral.js";
import { blendHexColors } from "@/lib/colorUtils";

export type HandMixDecision = "mix" | "test" | "buy";
export type HandMixConfidence = "high" | "medium" | "low";

export interface HandMixSimulation {
  targetHex: string;
  predictedHex: string;
  deltaE: number;
  decision: HandMixDecision;
  confidence: HandMixConfidence;
  label: string;
  recipe: string;
}

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const HEX_CHANNEL_RADIX = 16;
const HEX_RED_START = 1;
const HEX_RED_END = 3;
const HEX_GREEN_START = 3;
const HEX_GREEN_END = 5;
const HEX_BLUE_START = 5;
const HEX_BLUE_END = 7;

const RGB_CHANNEL_MAX = 255;
const RGB_TO_XYZ_SCALE = 100;
const SRGB_LINEAR_THRESHOLD = 0.04045;
const SRGB_OFFSET = 0.055;
const SRGB_OFFSET_SCALE = 1.055;
const SRGB_LINEAR_DIVISOR = 12.92;
const SRGB_GAMMA = 2.4;

const D65_X = 95.047;
const D65_Y = 100;
const D65_Z = 108.883;
const LAB_EPSILON = 0.008856;
const LAB_KAPPA = 7.787;
const LAB_OFFSET = 16 / 116;
const LAB_LIGHTNESS_SCALE = 116;
const LAB_LIGHTNESS_OFFSET = 16;
const LAB_A_SCALE = 500;
const LAB_B_SCALE = 200;
const LAB_CUBE_ROOT_POWER = 1 / 3;

const RGB_TO_XYZ = {
  redX: 0.4124,
  greenX: 0.3576,
  blueX: 0.1805,
  redY: 0.2126,
  greenY: 0.7152,
  blueY: 0.0722,
  redZ: 0.0193,
  greenZ: 0.1192,
  blueZ: 0.9505,
} as const;

const CIEDE2000_KL = 1;
const CIEDE2000_KC = 1;
const CIEDE2000_KH = 1;
const DEGREES_PER_HALF_TURN = 180;
const DEGREES_PER_FULL_TURN = 360;
const CIEDE2000_CHROMA_REFERENCE = 25;
const CIEDE2000_CHROMA_POWER = 7;
const CIEDE2000_HALF = 0.5;
const CIEDE2000_HUE_TERM_BASE = 1;
const CIEDE2000_T_COS_1_WEIGHT = 0.17;
const CIEDE2000_T_COS_1_SHIFT = 30;
const CIEDE2000_T_COS_2_WEIGHT = 0.24;
const CIEDE2000_T_COS_3_WEIGHT = 0.32;
const CIEDE2000_T_COS_3_MULTIPLIER = 3;
const CIEDE2000_T_COS_3_SHIFT = 6;
const CIEDE2000_T_COS_4_WEIGHT = 0.2;
const CIEDE2000_T_COS_4_MULTIPLIER = 4;
const CIEDE2000_T_COS_4_SHIFT = 63;
const CIEDE2000_DELTA_THETA_SCALE = 30;
const CIEDE2000_DELTA_THETA_CENTER = 275;
const CIEDE2000_DELTA_THETA_WIDTH = 25;
const CIEDE2000_RC_SCALE = 2;
const CIEDE2000_SL_WEIGHT = 0.015;
const CIEDE2000_SL_CENTER = 50;
const CIEDE2000_SL_OFFSET = 20;
const CIEDE2000_SC_WEIGHT = 0.045;
const CIEDE2000_SH_WEIGHT = 0.015;

const MIX_FACTOR_MIN = 0;
const MIX_FACTOR_MAX = 1;
const PERCENT_SCALE = 100;
const PERCENT_MIN = 0;
const PERCENT_DECIMALS = 0;
const DELTA_E_DECIMALS = 1;
const SIMULATION_ERROR_DELTA_E = 99;

export const HAND_MIX_DELTA_E_MIX_LIMIT = 3;
export const HAND_MIX_DELTA_E_TEST_LIMIT = 7;

// A human "% match" for a hand mix — how closely the predicted mix lands
// on the target color. One ΔE unit costs HAND_MIX_MATCH_DE_FALLOFF
// points, clamped to 0–100. Shown alongside the Mix OK / Test first label.
export const HAND_MIX_MATCH_DE_FALLOFF = 1;
export function handMixMatchPercent(deltaE: number): number {
  return Math.round(
    clamp(
      PERCENT_SCALE - deltaE * HAND_MIX_MATCH_DE_FALLOFF,
      PERCENT_MIN,
      PERCENT_SCALE
    )
  );
}

const DECISION_COPY: Record<
  HandMixDecision,
  { confidence: HandMixConfidence; label: string }
> = {
  mix: { confidence: "high", label: "Mix OK" },
  test: { confidence: "medium", label: "Test first" },
  buy: { confidence: "low", label: "Buy paint" },
};

type Lab = [number, number, number];

function normalizeHex(hex: string): string | null {
  if (!HEX_COLOR_PATTERN.test(hex)) return null;
  return hex.toUpperCase();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, decimals: number): number {
  return Number(value.toFixed(decimals));
}

function srgbToXyzChannel(channel: number): number {
  const normalized = channel / RGB_CHANNEL_MAX;
  const linear =
    normalized > SRGB_LINEAR_THRESHOLD
      ? Math.pow((normalized + SRGB_OFFSET) / SRGB_OFFSET_SCALE, SRGB_GAMMA)
      : normalized / SRGB_LINEAR_DIVISOR;
  return linear * RGB_TO_XYZ_SCALE;
}

function labPivot(value: number): number {
  return value > LAB_EPSILON
    ? Math.pow(value, LAB_CUBE_ROOT_POWER)
    : LAB_KAPPA * value + LAB_OFFSET;
}

function hexToLab(hex: string): Lab {
  const red = parseInt(hex.slice(HEX_RED_START, HEX_RED_END), HEX_CHANNEL_RADIX);
  const green = parseInt(
    hex.slice(HEX_GREEN_START, HEX_GREEN_END),
    HEX_CHANNEL_RADIX
  );
  const blue = parseInt(
    hex.slice(HEX_BLUE_START, HEX_BLUE_END),
    HEX_CHANNEL_RADIX
  );

  const r = srgbToXyzChannel(red);
  const g = srgbToXyzChannel(green);
  const b = srgbToXyzChannel(blue);

  const x = r * RGB_TO_XYZ.redX + g * RGB_TO_XYZ.greenX + b * RGB_TO_XYZ.blueX;
  const y = r * RGB_TO_XYZ.redY + g * RGB_TO_XYZ.greenY + b * RGB_TO_XYZ.blueY;
  const z = r * RGB_TO_XYZ.redZ + g * RGB_TO_XYZ.greenZ + b * RGB_TO_XYZ.blueZ;

  const fx = labPivot(x / D65_X);
  const fy = labPivot(y / D65_Y);
  const fz = labPivot(z / D65_Z);

  return [
    LAB_LIGHTNESS_SCALE * fy - LAB_LIGHTNESS_OFFSET,
    LAB_A_SCALE * (fx - fy),
    LAB_B_SCALE * (fy - fz),
  ];
}

function hueDegrees(b: number, a: number): number {
  if (a === MIX_FACTOR_MIN && b === MIX_FACTOR_MIN) return MIX_FACTOR_MIN;
  const hue = Math.atan2(b, a) * (DEGREES_PER_HALF_TURN / Math.PI);
  return hue >= MIX_FACTOR_MIN ? hue : hue + DEGREES_PER_FULL_TURN;
}

function deltaE2000(lab1: Lab, lab2: Lab): number {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;
  const degreesToRadians = Math.PI / DEGREES_PER_HALF_TURN;
  const chromaReferencePow = Math.pow(
    CIEDE2000_CHROMA_REFERENCE,
    CIEDE2000_CHROMA_POWER
  );

  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const cBarPow = Math.pow(
    (C1 + C2) * CIEDE2000_HALF,
    CIEDE2000_CHROMA_POWER
  );
  const G =
    CIEDE2000_HALF *
    (CIEDE2000_HUE_TERM_BASE -
      Math.sqrt(cBarPow / (cBarPow + chromaReferencePow)));

  const a1p = (CIEDE2000_HUE_TERM_BASE + G) * a1;
  const a2p = (CIEDE2000_HUE_TERM_BASE + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const h1p = hueDegrees(b1, a1p);
  const h2p = hueDegrees(b2, a2p);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp = MIX_FACTOR_MIN;
  if (C1p * C2p !== MIX_FACTOR_MIN) {
    const diff = h2p - h1p;
    if (Math.abs(diff) <= DEGREES_PER_HALF_TURN) dhp = diff;
    else
      dhp =
        diff > DEGREES_PER_HALF_TURN
          ? diff - DEGREES_PER_FULL_TURN
          : diff + DEGREES_PER_FULL_TURN;
  }

  const dHp =
    CIEDE2000_RC_SCALE *
    Math.sqrt(C1p * C2p) *
    Math.sin((dhp * degreesToRadians) * CIEDE2000_HALF);

  const LBarp = (L1 + L2) * CIEDE2000_HALF;
  const CBarp = (C1p + C2p) * CIEDE2000_HALF;

  let hBarp = h1p + h2p;
  if (C1p * C2p !== MIX_FACTOR_MIN) {
    if (Math.abs(h1p - h2p) <= DEGREES_PER_HALF_TURN) {
      hBarp = (h1p + h2p) * CIEDE2000_HALF;
    } else {
      hBarp =
        (h1p +
          h2p +
          (h1p + h2p < DEGREES_PER_FULL_TURN
            ? DEGREES_PER_FULL_TURN
            : -DEGREES_PER_FULL_TURN)) *
        CIEDE2000_HALF;
    }
  }

  const T =
    CIEDE2000_HUE_TERM_BASE -
    CIEDE2000_T_COS_1_WEIGHT *
      Math.cos((hBarp - CIEDE2000_T_COS_1_SHIFT) * degreesToRadians) +
    CIEDE2000_T_COS_2_WEIGHT *
      Math.cos(CIEDE2000_RC_SCALE * hBarp * degreesToRadians) +
    CIEDE2000_T_COS_3_WEIGHT *
      Math.cos(
        (CIEDE2000_T_COS_3_MULTIPLIER * hBarp +
          CIEDE2000_T_COS_3_SHIFT) *
          degreesToRadians
      ) -
    CIEDE2000_T_COS_4_WEIGHT *
      Math.cos(
        (CIEDE2000_T_COS_4_MULTIPLIER * hBarp -
          CIEDE2000_T_COS_4_SHIFT) *
          degreesToRadians
      );

  const dTheta =
    CIEDE2000_DELTA_THETA_SCALE *
    Math.exp(
      -Math.pow(
        (hBarp - CIEDE2000_DELTA_THETA_CENTER) /
          CIEDE2000_DELTA_THETA_WIDTH,
        CIEDE2000_RC_SCALE
      )
    );
  const CBarpPow = Math.pow(CBarp, CIEDE2000_CHROMA_POWER);
  const Rc =
    CIEDE2000_RC_SCALE *
    Math.sqrt(CBarpPow / (CBarpPow + chromaReferencePow));
  const lightnessOffset = LBarp - CIEDE2000_SL_CENTER;
  const Sl =
    CIEDE2000_HUE_TERM_BASE +
    (CIEDE2000_SL_WEIGHT * Math.pow(lightnessOffset, CIEDE2000_RC_SCALE)) /
      Math.sqrt(
        CIEDE2000_SL_OFFSET +
          Math.pow(lightnessOffset, CIEDE2000_RC_SCALE)
      );
  const Sc = CIEDE2000_HUE_TERM_BASE + CIEDE2000_SC_WEIGHT * CBarp;
  const Sh =
    CIEDE2000_HUE_TERM_BASE + CIEDE2000_SH_WEIGHT * CBarp * T;
  const Rt =
    -Math.sin(CIEDE2000_RC_SCALE * dTheta * degreesToRadians) * Rc;

  const lTerm = dLp / (CIEDE2000_KL * Sl);
  const cTerm = dCp / (CIEDE2000_KC * Sc);
  const hTerm = dHp / (CIEDE2000_KH * Sh);

  return Math.sqrt(
    lTerm * lTerm + cTerm * cTerm + hTerm * hTerm + Rt * cTerm * hTerm
  );
}

function decisionForDeltaE(deltaE: number): HandMixDecision {
  if (deltaE <= HAND_MIX_DELTA_E_MIX_LIMIT) return "mix";
  if (deltaE <= HAND_MIX_DELTA_E_TEST_LIMIT) return "test";
  return "buy";
}

function recipeFor(t: number): string {
  const fromPercent = roundTo(
    (MIX_FACTOR_MAX - t) * PERCENT_SCALE,
    PERCENT_DECIMALS
  );
  const toPercent = roundTo(t * PERCENT_SCALE, PERCENT_DECIMALS);
  return `${fromPercent}% / ${toPercent}%`;
}

function fallbackSimulation(targetHex: string, t: number): HandMixSimulation {
  const decision = "buy";
  const copy = DECISION_COPY[decision];
  return {
    targetHex,
    predictedHex: targetHex,
    deltaE: SIMULATION_ERROR_DELTA_E,
    decision,
    confidence: copy.confidence,
    label: copy.label,
    recipe: recipeFor(t),
  };
}

export function simulatePaintLikeMix(
  fromHex: string,
  toHex: string,
  t: number,
  targetHex?: string
): HandMixSimulation {
  const clampedT = clamp(t, MIX_FACTOR_MIN, MIX_FACTOR_MAX);
  const from = normalizeHex(fromHex);
  const to = normalizeHex(toHex);
  const targetCandidate =
    targetHex ?? (from && to ? blendHexColors(from, to, clampedT) : fromHex);
  const target = normalizeHex(targetCandidate);

  if (!from || !to || !target) {
    return fallbackSimulation(target ?? targetCandidate, clampedT);
  }

  const predictedHex = spectralMix(
    [new Color(from), MIX_FACTOR_MAX - clampedT],
    [new Color(to), clampedT]
  ).toString({ format: "hex", method: "map" });
  const deltaE = roundTo(
    deltaE2000(hexToLab(target), hexToLab(predictedHex)),
    DELTA_E_DECIMALS
  );
  const decision = decisionForDeltaE(deltaE);
  const copy = DECISION_COPY[decision];

  return {
    targetHex: target,
    predictedHex,
    deltaE,
    decision,
    confidence: copy.confidence,
    label: copy.label,
    recipe: recipeFor(clampedT),
  };
}
