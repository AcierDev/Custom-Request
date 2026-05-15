// Generates a SEAMLESSLY TILEABLE Douglas fir flat-sawn wood grain PNG.
// No deps — encodes PNG via Node's built-in zlib.
//
// The finished art is SPRAY COATED: the palette color sits on top of the
// grain, so this texture is near-neutral, bright grayscale. It only
// modulates shading — the painted color reads on the rings too, with a
// Douglas fir cathedral-arch relief showing through.
//
// Tiling: the grain is built from a phase field that is periodic in BOTH
// axes (integer ring count over H + fully periodic warp/noise), so squares
// that wrap across the texture edge no longer show a seam.
//
// Run: node scripts/gen-douglas-fir.cjs

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const W = 1024;
const H = 1024;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎨 PALETTE                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
// Neutral grayscale luminance values (multiply against the spray-coat color).
const L_EARLY = 1.0; // brightest earlywood — paint shows at full color
const L_EARLY2 = 0.9;
const L_LATE = 0.6; // latewood ring — darker shade of the spray color
const L_DARK = 0.48; // deepest grain line

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🌲 GRAIN SHAPE                                                        ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
const N_RINGS = 12; // integer → rings tile perfectly over H
const WARP_AMP = 6.0; // ring units of cathedral-arch sweep
const SWEEP_AMP = 2.4; // broad low-freq drift of the arches

function lerp(a, b, t) {
  return a + (b - a) * t;
}
function fade(t) {
  return t * t * (3 - 2 * t);
}

// Value noise periodic in BOTH axes (lattice wraps at px / py).
function hash(i, j) {
  const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function pnoise(nx, ny, px, py) {
  const gx = nx * px;
  const gy = ny * py;
  const xi = Math.floor(gx);
  const yi = Math.floor(gy);
  const u = fade(gx - xi);
  const v = fade(gy - yi);
  const wx = (n) => ((n % px) + px) % px;
  const wy = (n) => ((n % py) + py) % py;
  const a = hash(wx(xi), wy(yi));
  const b = hash(wx(xi + 1), wy(yi));
  const c = hash(wx(xi), wy(yi + 1));
  const d = hash(wx(xi + 1), wy(yi + 1));
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
function pfbm(nx, ny, px, py, oct) {
  let amp = 0.5;
  let sum = 0;
  let qx = px;
  let qy = py;
  for (let o = 0; o < oct; o++) {
    sum += amp * pnoise(nx, ny, qx, qy);
    qx *= 2;
    qy *= 2;
    amp *= 0.5;
  }
  return sum;
}

const data = Buffer.alloc(W * H * 4);

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const nx = x / W;
    const ny = y / H;

    // Phase field: integer ring count over H + periodic warp = tileable.
    // The warp bends the rings into wandering cathedral arches.
    const warp = pfbm(nx, ny, 3, 2, 4) - 0.5;
    const sweep = pfbm(nx, ny, 2, 1, 2) - 0.5;
    const phase = ny * N_RINGS + WARP_AMP * warp + SWEEP_AMP * sweep;
    const ring = phase - Math.floor(phase); // 0..1 across one ring

    // Douglas fir: wide soft earlywood, then a narrower darker latewood band
    let t;
    if (ring < 0.82) {
      t = (ring / 0.82) * 0.3;
    } else {
      t = 0.3 + Math.pow((ring - 0.82) / 0.18, 1.5) * 0.7;
    }

    // neutral luminance ramp (no hue — spray-coat color provides the color)
    let L;
    if (t < 0.3) L = lerp(L_EARLY, L_EARLY2, t / 0.3);
    else if (t < 0.8) L = lerp(L_EARLY2, L_LATE, (t - 0.3) / 0.5);
    else L = lerp(L_LATE, L_DARK, (t - 0.8) / 0.2);

    // fine longitudinal fiber streaks (periodic → tileable)
    const fiber = (pfbm(nx, ny, 90, 12, 3) - 0.5) * 0.04;
    // broad tonal blotching
    const blotch = (pfbm(nx, ny, 4, 4, 2) - 0.5) * 0.04;

    const vv = Math.max(0, Math.min(1, L + fiber + blotch)) * 255;
    const i = (y * W + x) * 4;
    data[i] = vv;
    data[i + 1] = vv;
    data[i + 2] = vv;
    data[i + 3] = 255;
  }
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 PNG ENCODER                                                        ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
const CRC = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return (buf) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
})();

function chunk(type, body) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length, 0);
  const tb = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(CRC(Buffer.concat([tb, body])), 0);
  return Buffer.concat([len, tb, body, crc]);
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0; // no filter
  data.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
}
const idat = zlib.deflateSync(raw, { level: 9 });

const png = Buffer.concat([
  sig,
  chunk("IHDR", ihdr),
  chunk("IDAT", idat),
  chunk("IEND", Buffer.alloc(0)),
]);

const out = path.join(__dirname, "..", "public", "textures", "douglas-fir.png");
fs.writeFileSync(out, png);
console.log("wrote", out, (png.length / 1024).toFixed(0) + "KB");
