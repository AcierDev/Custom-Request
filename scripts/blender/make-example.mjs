/** Deterministic demonstration files; actual customer designs use Render file. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBlenderPackage } from '../../src/lib/blender/blenderPackage.ts';
import { buildBackboardBodyGeometry, resolveBackboardBodies } from '../../src/lib/backboardGeometry.ts';
import { getNormalizedWedgeCorners } from '../../src/lib/wedgeGeometry.ts';

const C = { columns: 24, rows: 12, squareSize: 0.5, gap: 0, panelCount: 1,
  sceneUnitsPerInch: 1 / 6, half: 0.5, orientation: 0, updatedAt: 1,
  grainCount: 14, quarterTurn: Math.PI / 2, quarterTurnCount: 4,
  colorWaveX: 0.9, colorWaveY: 1.7, colorWaveAmplitude: 0.55,
  rotationStrideX: 3, rotationStrideY: 5, grainStrideX: 7, grainStrideY: 11,
  palette: ['#ad815e','#c8ac86','#c8c8b6','#9faea7','#66868b','#3b626d','#254753','#16323c'],
  wallColor: '#dedad0', miniScale: 2.65 / 6, miniColumns: 8, miniRows: 16, miniGap: 0.0625,
  miniPanels: 2, panelDrift: 0.5 };
const folder = resolve(dirname(fileURLToPath(import.meta.url)), '../../output/blender-render/examples');
mkdirSync(folder, { recursive: true });
function example(mini = false) {
  const columns = mini ? C.miniColumns : C.columns, rows = mini ? C.miniRows : C.rows;
  const size = mini ? C.miniScale : C.squareSize, gap = mini ? C.miniGap : C.gap;
  const panelCount = mini ? C.miniPanels : C.panelCount;
  const stride = size + gap * C.sceneUnitsPerInch;
  const totalWidth = columns * size + (columns - 1) * gap * C.sceneUnitsPerInch;
  const totalHeight = rows * size + (rows - 1) * gap * C.sceneUnitsPerInch;
  const miniCorrection = mini ? (C.squareSize - size) * C.half : 0;
  const offsetX = -totalWidth * C.half - C.squareSize * C.half + miniCorrection + size * C.half;
  const offsetY = -totalHeight * C.half - C.squareSize * C.half + miniCorrection + size * C.half;
  const bodies = buildBackboardBodyGeometry({ columnCount: columns, rowCount: rows,
    squareSizeSceneUnits: size, squareSpacingScale: 1, useMini: mini, squareGapInches: gap, panelCount });
  const board = resolveBackboardBodies(bodies, mini ? C.panelDrift : 0, 1);
  const instances = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    const boardIndex = mini && x >= columns * C.half ? 1 : 0;
    const shift = board[boardIndex].center[0] - board[boardIndex].baseCenter[0];
    const paletteIndex = Math.max(0, Math.min(C.palette.length - 1,
      Math.floor(x / columns * C.palette.length + Math.sin(y * C.colorWaveY + x * C.colorWaveX) * C.colorWaveAmplitude)));
    const px = offsetX + x * stride + shift, py = offsetY + y * stride;
    instances.push({ x, y, px, py, pz: -getNormalizedWedgeCorners()[0].z * size,
      baseX: px, driftDir: 0, rotationZ: ((x * C.rotationStrideX + y * C.rotationStrideY) % C.quarterTurnCount) * C.quarterTurn,
      physicalScale: size, scaleXY: size, scaleZ: size,
      grainIndex: (x * C.grainStrideX + y * C.grainStrideY) % C.grainCount, color: C.palette[paletteIndex], hidden: false });
  }
  return buildBlenderPackage({ instances, backboardBodies: board, squareGapInches: gap, panelCount,
    panelSpacingInches: mini ? C.panelDrift / C.sceneUnitsPerInch : 0,
    orientationRotationZ: mini ? C.quarterTurn : C.orientation, totalWidth, totalHeight,
    squareSize: size, useMini: mini, showWoodGrain: true, backboardColor: null, updatedAt: C.updatedAt },
  { wallColor: C.wallColor, timeOfDay: 'afternoon', lampOn: true });
}
for (const [name, mini] of [['example-landscape', false], ['example-rotated-split-mini', true]]) {
  const path = resolve(folder, `${name}.everwood.json`);
  writeFileSync(path, JSON.stringify(example(mini)));
  console.log(path);
}
