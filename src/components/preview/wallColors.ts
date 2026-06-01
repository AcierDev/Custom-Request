//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎨 WALL COLOR OPTIONS                                                 ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export const DEFAULT_WALL_COLOR = "#b8b2a4";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🪜 WALL COLOR FAMILIES — main hue → lightest…darkest ramp             ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// The shared viewer shows one swatch per MAIN colour (Greige, Gray, Blue,
// Green, Blush). Picking a main colour reveals a ramp of that hue from
// lightest to darkest, so a recipient can dial in the exact shade of their
// own wall without a wall of 30 near-identical chips.

export interface WallColorShade {
  name: string;
  hex: string;
}

export interface WallColorFamily {
  /** Main colour name shown at the top level (e.g. "Blue"). */
  name: string;
  /** Representative swatch for the top-level chip — the family mid-tone. */
  swatch: string;
  /** Shades ordered lightest → darkest. */
  shades: WallColorShade[];
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Linear blend between two hex colours (t: 0 → a, 1 → b). */
function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

// Each family is authored as light / base / dark anchors; the 5-step ramp
// (lightest → darkest) is interpolated from them so the steps stay even.
const FAMILY_SPECS: {
  name: string;
  light: string;
  base: string;
  dark: string;
}[] = [
  { name: "Greige", light: "#e7e1d6", base: DEFAULT_WALL_COLOR, dark: "#6f6a5e" },
  { name: "Gray", light: "#e3e4e3", base: "#c8c9c7", dark: "#5f6364" },
  { name: "Blue", light: "#dbe3ea", base: "#aebdca", dark: "#5d6f80" },
  { name: "Green", light: "#dee3d6", base: "#b8c1ad", dark: "#6e7960" },
  { name: "Blush", light: "#efe3dd", base: "#d9c6bd", dark: "#9a7f74" },
  { name: "Terracotta", light: "#ecd8cc", base: "#c89b82", dark: "#7d5641" },
  { name: "Sand", light: "#efe6cd", base: "#cdb985", dark: "#857148" },
  { name: "Teal", light: "#d4e2e0", base: "#9bbdb8", dark: "#4f6f6a" },
  { name: "Lavender", light: "#e2dceb", base: "#b3a9c6", dark: "#695f80" },
  { name: "Mauve", light: "#e8dce1", base: "#bfa6b1", dark: "#7a6069" },
];

const SHADE_LABELS = ["Lightest", "Light", "Mid", "Deep", "Darkest"];

export const WALL_COLOR_FAMILIES: WallColorFamily[] = FAMILY_SPECS.map(
  ({ name, light, base, dark }) => {
    const hexes = [
      light,
      mix(light, base, 0.5),
      base,
      mix(base, dark, 0.5),
      dark,
    ];
    return {
      name,
      swatch: base,
      shades: hexes.map((hex, i) => ({
        name: `${name} ${SHADE_LABELS[i]}`,
        hex,
      })),
    };
  }
);

/** Find which family/shade a hex belongs to (case-insensitive), if any. */
export function findWallColorFamily(hex: string): WallColorFamily | undefined {
  const target = hex.toLowerCase();
  return WALL_COLOR_FAMILIES.find((fam) =>
    fam.shades.some((s) => s.hex.toLowerCase() === target)
  );
}
