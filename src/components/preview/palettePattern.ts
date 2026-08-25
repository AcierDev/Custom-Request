import {
  PALETTE_BLEND_CONFIG,
  normalizePaletteBlendPercent,
} from "@/lib/paletteBlend";

export type PalettePatternOrientation = "horizontal" | "vertical";

export interface PalettePatternOptions {
  width: number;
  height: number;
  squareCounts: readonly number[];
  orientation: PalettePatternOrientation;
  isReversed: boolean;
  blendPercent: number;
}

interface GridPosition {
  x: number;
  y: number;
}

interface PaletteSwap {
  first: GridPosition;
  second: GridPosition;
  firstColor: number;
  secondColor: number;
}

interface BoundaryPlan {
  swaps: PaletteSwap[];
  swapCapacity: number;
}

const FIRST_GRID_INDEX = 0;
const GRID_STEP = 1;
const FIRST_COLOR_INDEX = 0;
const LAST_COLOR_OFFSET = 1;
const INTERIOR_BOUNDARY_DEGREE = 2;
const BLEND_PERCENT_DIVISOR = 100;
const DISTRIBUTION_CENTER_OFFSET = 0.5;
const DISTRIBUTION_PHASE_STEP = 5;
const DISTRIBUTION_PHASE_OFFSET = 1;
const MIN_ALIGNED_SWAP_COUNT = 1;
const ALIGNED_SWAP_DIVISOR = 2;
const MIN_PRESERVED_INTERIOR_COLOR_SQUARE_COUNT = 1;
const NO_SOLID_COLOR = null;

const positionKey = ({ x, y }: GridPosition): string => `${x}-${y}`;

function getMaximumBlendSquareCount(lineLength: number): number {
  return Math.min(
    Math.floor(lineLength / ALIGNED_SWAP_DIVISOR),
    Math.max(
      MIN_ALIGNED_SWAP_COUNT,
      Math.floor(lineLength * PALETTE_BLEND_CONFIG.maxSwapFraction),
    ),
  );
}

function rebalanceThinEdgeColorCounts(
  squareCounts: readonly number[],
  lineLength: number,
  blendStrength: number,
): number[] {
  const counts = squareCounts.map((count) =>
    Math.max(FIRST_GRID_INDEX, count ?? FIRST_GRID_INDEX),
  );
  if (counts.length <= INTERIOR_BOUNDARY_DEGREE) return counts;

  const lastColorIndex = counts.length - LAST_COLOR_OFFSET;
  const edgeColorIndices = [FIRST_COLOR_INDEX, lastColorIndex];
  const edgeBlendSquareCount = Math.max(
    MIN_ALIGNED_SWAP_COUNT,
    Math.round(getMaximumBlendSquareCount(lineLength) * blendStrength),
  );
  const edgeDeficits = edgeColorIndices.map((colorIndex) =>
    counts[colorIndex] <= lineLength
      ? lineLength + edgeBlendSquareCount - counts[colorIndex]
      : FIRST_GRID_INDEX,
  );
  const requestedAddition = edgeDeficits.reduce(
    (total, deficit) => total + deficit,
    FIRST_GRID_INDEX,
  );
  const availableInteriorSquares = counts
    .slice(GRID_STEP, lastColorIndex)
    .reduce(
      (total, count) =>
        total +
        Math.max(
          FIRST_GRID_INDEX,
          count - MIN_PRESERVED_INTERIOR_COLOR_SQUARE_COUNT,
        ),
      FIRST_GRID_INDEX,
    );
  const additionLimit = Math.min(
    requestedAddition,
    availableInteriorSquares,
  );
  if (additionLimit <= FIRST_GRID_INDEX) return counts;

  let remainingAddition = additionLimit;
  let remainingDeficit = requestedAddition;
  for (const [edgeOffset, colorIndex] of edgeColorIndices.entries()) {
    const deficit = edgeDeficits[edgeOffset];
    const addition =
      edgeOffset === edgeColorIndices.length - LAST_COLOR_OFFSET
        ? Math.min(deficit, remainingAddition)
        : Math.min(
            deficit,
            Math.round((remainingAddition * deficit) / remainingDeficit),
          );
    counts[colorIndex] += addition;
    remainingAddition -= addition;
    remainingDeficit -= deficit;
  }

  let squaresToRemove = additionLimit;
  while (squaresToRemove > FIRST_GRID_INDEX) {
    let donorColorIndex = GRID_STEP;
    for (
      let colorIndex = donorColorIndex + GRID_STEP;
      colorIndex < lastColorIndex;
      colorIndex += GRID_STEP
    ) {
      if (counts[colorIndex] > counts[donorColorIndex]) {
        donorColorIndex = colorIndex;
      }
    }
    if (
      counts[donorColorIndex] <=
      MIN_PRESERVED_INTERIOR_COLOR_SQUARE_COUNT
    ) {
      break;
    }
    counts[donorColorIndex] -= GRID_STEP;
    squaresToRemove -= GRID_STEP;
  }

  return counts;
}

function reinforceOuterProgressionLines(
  colorMap: number[][],
  lineCount: number,
  lineLength: number,
  orientation: PalettePatternOrientation,
  isReversed: boolean,
  colorCount: number,
): void {
  if (lineCount <= FIRST_GRID_INDEX || colorCount <= FIRST_GRID_INDEX) return;

  const lastColorIndex = colorCount - LAST_COLOR_OFFSET;
  const outerLines = [FIRST_GRID_INDEX, lineCount - LAST_COLOR_OFFSET];
  const outerColors = isReversed
    ? [lastColorIndex, FIRST_COLOR_INDEX]
    : [FIRST_COLOR_INDEX, lastColorIndex];

  for (const [edgeOffset, progressionLine] of outerLines.entries()) {
    for (
      let crossAxisPosition = FIRST_GRID_INDEX;
      crossAxisPosition < lineLength;
      crossAxisPosition += GRID_STEP
    ) {
      const position = getPhysicalGridPosition(
        progressionLine,
        crossAxisPosition,
        orientation,
      );
      colorMap[position.x][position.y] = outerColors[edgeOffset];
    }
  }
}

function reserveOuterProgressionLines(
  reservedPositions: Set<string>,
  lineCount: number,
  lineLength: number,
  orientation: PalettePatternOrientation,
): void {
  const outerLines = [FIRST_GRID_INDEX, lineCount - LAST_COLOR_OFFSET];
  for (const progressionLine of outerLines) {
    for (
      let crossAxisPosition = FIRST_GRID_INDEX;
      crossAxisPosition < lineLength;
      crossAxisPosition += GRID_STEP
    ) {
      reservedPositions.add(
        positionKey(
          getPhysicalGridPosition(
            progressionLine,
            crossAxisPosition,
            orientation,
          ),
        ),
      );
    }
  }
}

function getGridPosition(
  traversalLine: number,
  crossAxisPosition: number,
  lineCount: number,
  orientation: PalettePatternOrientation,
  isReversed: boolean,
): GridPosition {
  const progressionLine = isReversed
    ? lineCount - LAST_COLOR_OFFSET - traversalLine
    : traversalLine;
  return orientation === "horizontal"
    ? { x: progressionLine, y: crossAxisPosition }
    : { x: crossAxisPosition, y: progressionLine };
}

function buildSerpentinePath(
  width: number,
  height: number,
  orientation: PalettePatternOrientation,
  isReversed: boolean,
): GridPosition[] {
  const horizontal = orientation === "horizontal";
  const lineCount = horizontal ? width : height;
  const lineLength = horizontal ? height : width;
  const path: GridPosition[] = [];

  for (
    let traversalLine = FIRST_GRID_INDEX;
    traversalLine < lineCount;
    traversalLine += GRID_STEP
  ) {
    const reverseCrossAxis =
      traversalLine % INTERIOR_BOUNDARY_DEGREE !== FIRST_GRID_INDEX;
    for (
      let traversalPosition = FIRST_GRID_INDEX;
      traversalPosition < lineLength;
      traversalPosition += GRID_STEP
    ) {
      const crossAxisPosition = reverseCrossAxis
        ? lineLength - LAST_COLOR_OFFSET - traversalPosition
        : traversalPosition;
      path.push(
        getGridPosition(
          traversalLine,
          crossAxisPosition,
          lineCount,
          orientation,
          isReversed,
        ),
      );
    }
  }

  return path;
}

function getOrthogonalNeighbors(
  position: GridPosition,
  width: number,
  height: number,
): GridPosition[] {
  const neighbors: GridPosition[] = [];
  if (position.x > FIRST_GRID_INDEX) {
    neighbors.push({ x: position.x - GRID_STEP, y: position.y });
  }
  if (position.x + GRID_STEP < width) {
    neighbors.push({ x: position.x + GRID_STEP, y: position.y });
  }
  if (position.y > FIRST_GRID_INDEX) {
    neighbors.push({ x: position.x, y: position.y - GRID_STEP });
  }
  if (position.y + GRID_STEP < height) {
    neighbors.push({ x: position.x, y: position.y + GRID_STEP });
  }
  return neighbors;
}

function everySquareTouchesSameColor(
  colorMap: number[][],
  width: number,
  height: number,
): boolean {
  for (let x = FIRST_GRID_INDEX; x < width; x += GRID_STEP) {
    for (let y = FIRST_GRID_INDEX; y < height; y += GRID_STEP) {
      const position = { x, y };
      const color = colorMap[x][y];
      if (
        !getOrthogonalNeighbors(position, width, height).some(
          (neighbor) => colorMap[neighbor.x][neighbor.y] === color,
        )
      ) {
        return false;
      }
    }
  }
  return true;
}

function getPhysicalGridPosition(
  progressionLine: number,
  crossAxisPosition: number,
  orientation: PalettePatternOrientation,
): GridPosition {
  return orientation === "horizontal"
    ? { x: progressionLine, y: crossAxisPosition }
    : { x: crossAxisPosition, y: progressionLine };
}

function getSolidProgressionLineColor(
  colorMap: number[][],
  progressionLine: number,
  lineLength: number,
  orientation: PalettePatternOrientation,
): number | null {
  const firstPosition = getPhysicalGridPosition(
    progressionLine,
    FIRST_GRID_INDEX,
    orientation,
  );
  const solidColor = colorMap[firstPosition.x][firstPosition.y];

  for (
    let crossAxisPosition = GRID_STEP;
    crossAxisPosition < lineLength;
    crossAxisPosition += GRID_STEP
  ) {
    const position = getPhysicalGridPosition(
      progressionLine,
      crossAxisPosition,
      orientation,
    );
    if (colorMap[position.x][position.y] !== solidColor) {
      return NO_SOLID_COLOR;
    }
  }

  return solidColor;
}

function colorCanReachProgressionLine(
  hardMap: number[][],
  color: number,
  progressionLine: number,
  lineCount: number,
  lineLength: number,
  orientation: PalettePatternOrientation,
): boolean {
  for (
    let candidateLine = FIRST_GRID_INDEX;
    candidateLine < lineCount;
    candidateLine += GRID_STEP
  ) {
    if (
      Math.abs(candidateLine - progressionLine) >
      PALETTE_BLEND_CONFIG.maxProgressionLineSpread
    ) {
      continue;
    }

    for (
      let crossAxisPosition = FIRST_GRID_INDEX;
      crossAxisPosition < lineLength;
      crossAxisPosition += GRID_STEP
    ) {
      const position = getPhysicalGridPosition(
        candidateLine,
        crossAxisPosition,
        orientation,
      );
      if (hardMap[position.x][position.y] === color) return true;
    }
  }

  return false;
}

function selectEvenlyDistributedPositions(
  lineLength: number,
  count: number,
  phase: number,
): number[] {
  if (count <= FIRST_GRID_INDEX) return [];
  if (count >= lineLength) {
    return Array.from({ length: lineLength }, (_, position) => position);
  }

  const positions = new Set<number>();
  for (let index = FIRST_GRID_INDEX; index < count; index += GRID_STEP) {
    const centeredPosition = Math.floor(
      ((index + DISTRIBUTION_CENTER_OFFSET) * lineLength) / count,
    );
    positions.add((centeredPosition + phase) % lineLength);
  }
  return [...positions].sort((first, second) => first - second);
}

function orderPositionsBySpread(
  positions: readonly number[],
  lineLength: number,
  seed: number,
): number[] {
  const remaining = [...positions];
  const ordered: number[] = [];

  while (remaining.length > FIRST_GRID_INDEX) {
    let bestIndex = FIRST_GRID_INDEX;
    let bestSpacing = -GRID_STEP;
    let bestSeedDistance = Number.POSITIVE_INFINITY;

    for (
      let candidateIndex = FIRST_GRID_INDEX;
      candidateIndex < remaining.length;
      candidateIndex += GRID_STEP
    ) {
      const candidate = remaining[candidateIndex];
      const spacing =
        ordered.length === FIRST_GRID_INDEX
          ? lineLength
          : Math.min(
              ...ordered.map((selected) => Math.abs(candidate - selected)),
            );
      const seedDistance = Math.abs(candidate - seed);
      if (
        spacing > bestSpacing ||
        (spacing === bestSpacing && seedDistance < bestSeedDistance)
      ) {
        bestIndex = candidateIndex;
        bestSpacing = spacing;
        bestSeedDistance = seedDistance;
      }
    }

    ordered.push(remaining[bestIndex]);
    remaining.splice(bestIndex, GRID_STEP);
  }

  return ordered;
}

function countTransitions(mask: ReadonlySet<number>, lineLength: number): number {
  let transitions = FIRST_GRID_INDEX;
  for (
    let position = GRID_STEP;
    position < lineLength;
    position += GRID_STEP
  ) {
    if (mask.has(position) !== mask.has(position - GRID_STEP)) {
      transitions += GRID_STEP;
    }
  }
  return transitions;
}

function buildPartialBoundarySwaps(
  hardMap: number[][],
  lineCount: number,
  lineLength: number,
  orientation: PalettePatternOrientation,
  isReversed: boolean,
  traversalLine: number,
  leftColor: number,
  rightColor: number,
  leftCountInLine: number,
  boundaryIndex: number,
): PaletteSwap[] {
  const originalLeftPositions = new Set<number>();
  for (
    let crossAxisPosition = FIRST_GRID_INDEX;
    crossAxisPosition < lineLength;
    crossAxisPosition += GRID_STEP
  ) {
    const position = getGridPosition(
      traversalLine,
      crossAxisPosition,
      lineCount,
      orientation,
      isReversed,
    );
    if (hardMap[position.x][position.y] === leftColor) {
      originalLeftPositions.add(crossAxisPosition);
    }
  }

  let targetLeftPositions = new Set<number>();
  let bestTransitionCount = -GRID_STEP;
  let bestChangedCount = FIRST_GRID_INDEX;
  const basePhase =
    boundaryIndex * DISTRIBUTION_PHASE_STEP + DISTRIBUTION_PHASE_OFFSET;

  for (
    let phaseOffset = FIRST_GRID_INDEX;
    phaseOffset < lineLength;
    phaseOffset += GRID_STEP
  ) {
    const candidate = new Set(
      selectEvenlyDistributedPositions(
        lineLength,
        leftCountInLine,
        (basePhase + phaseOffset) % lineLength,
      ),
    );
    const transitionCount = countTransitions(candidate, lineLength);
    const changedCount = [...candidate].filter(
      (position) => !originalLeftPositions.has(position),
    ).length;
    if (
      transitionCount > bestTransitionCount ||
      (transitionCount === bestTransitionCount &&
        changedCount > bestChangedCount)
    ) {
      targetLeftPositions = candidate;
      bestTransitionCount = transitionCount;
      bestChangedCount = changedCount;
    }
  }

  const leftToRight = orderPositionsBySpread(
    [...originalLeftPositions].filter(
      (position) => !targetLeftPositions.has(position),
    ),
    lineLength,
    basePhase % lineLength,
  );
  const rightToLeft = orderPositionsBySpread(
    [...targetLeftPositions].filter(
      (position) => !originalLeftPositions.has(position),
    ),
    lineLength,
    (basePhase + Math.floor(lineLength / ALIGNED_SWAP_DIVISOR)) %
      lineLength,
  );
  const swapCount = Math.min(leftToRight.length, rightToLeft.length);
  const swaps: PaletteSwap[] = [];

  for (
    let swapIndex = FIRST_GRID_INDEX;
    swapIndex < swapCount;
    swapIndex += GRID_STEP
  ) {
    swaps.push({
      first: getGridPosition(
        traversalLine,
        leftToRight[swapIndex],
        lineCount,
        orientation,
        isReversed,
      ),
      second: getGridPosition(
        traversalLine,
        rightToLeft[swapIndex],
        lineCount,
        orientation,
        isReversed,
      ),
      firstColor: leftColor,
      secondColor: rightColor,
    });
  }

  return swaps;
}

function selectSpreadSubset(
  positions: readonly number[],
  count: number,
  lineLength: number,
  seed: number,
): number[] {
  return orderPositionsBySpread(positions, lineLength, seed).slice(
    FIRST_GRID_INDEX,
    count,
  );
}

function buildAlignedBoundaryPlan(
  lineCount: number,
  lineLength: number,
  orientation: PalettePatternOrientation,
  isReversed: boolean,
  rightTraversalLine: number,
  leftColor: number,
  rightColor: number,
  boundaryIndex: number,
): BoundaryPlan {
  const leftTraversalLine = rightTraversalLine - GRID_STEP;
  if (
    leftTraversalLine < FIRST_GRID_INDEX ||
    rightTraversalLine >= lineCount
  ) {
    return { swaps: [], swapCapacity: FIRST_GRID_INDEX };
  }

  const maxSwapCount = getMaximumBlendSquareCount(lineLength);
  if (maxSwapCount <= FIRST_GRID_INDEX) {
    return { swaps: [], swapCapacity: FIRST_GRID_INDEX };
  }

  const phase =
    (boundaryIndex * DISTRIBUTION_PHASE_STEP + DISTRIBUTION_PHASE_OFFSET) %
    lineLength;
  const leftCrossAxisPositions = selectEvenlyDistributedPositions(
    lineLength,
    maxSwapCount,
    phase,
  );
  const leftCrossAxisSet = new Set(leftCrossAxisPositions);
  const availableRightPositions = Array.from(
    { length: lineLength },
    (_, position) => position,
  ).filter((position) => !leftCrossAxisSet.has(position));
  const rightCrossAxisPositions = selectSpreadSubset(
    availableRightPositions,
    maxSwapCount,
    lineLength,
    (phase + Math.floor(lineLength / ALIGNED_SWAP_DIVISOR)) % lineLength,
  );

  return {
    swaps: leftCrossAxisPositions.flatMap((leftCrossAxisPosition) =>
      rightCrossAxisPositions.map((rightCrossAxisPosition) => ({
        first: getGridPosition(
          leftTraversalLine,
          leftCrossAxisPosition,
          lineCount,
          orientation,
          isReversed,
        ),
        second: getGridPosition(
          rightTraversalLine,
          rightCrossAxisPosition,
          lineCount,
          orientation,
          isReversed,
        ),
        firstColor: leftColor,
        secondColor: rightColor,
      })),
    ),
    swapCapacity: Math.min(
      leftCrossAxisPositions.length,
      rightCrossAxisPositions.length,
    ),
  };
}

function buildBoundaryPlans(
  hardMap: number[][],
  squareCounts: readonly number[],
  lineCount: number,
  lineLength: number,
  orientation: PalettePatternOrientation,
  isReversed: boolean,
): BoundaryPlan[] {
  const plans: BoundaryPlan[] = [];
  let cumulativeSquareCount = FIRST_GRID_INDEX;

  for (
    let leftColor = FIRST_COLOR_INDEX;
    leftColor < squareCounts.length - LAST_COLOR_OFFSET;
    leftColor += GRID_STEP
  ) {
    cumulativeSquareCount += Math.max(
      FIRST_GRID_INDEX,
      squareCounts[leftColor] ?? FIRST_GRID_INDEX,
    );
    const rightColor = leftColor + LAST_COLOR_OFFSET;
    const traversalLine = Math.floor(cumulativeSquareCount / lineLength);
    const leftCountInLine = cumulativeSquareCount % lineLength;
    if (leftCountInLine === FIRST_GRID_INDEX) {
      plans.push(
        buildAlignedBoundaryPlan(
          lineCount,
          lineLength,
          orientation,
          isReversed,
          traversalLine,
          leftColor,
          rightColor,
          leftColor,
        ),
      );
      continue;
    }

    const swaps = buildPartialBoundarySwaps(
      hardMap,
      lineCount,
      lineLength,
      orientation,
      isReversed,
      traversalLine,
      leftColor,
      rightColor,
      leftCountInLine,
      leftColor,
    );
    plans.push({ swaps, swapCapacity: swaps.length });
  }

  return plans;
}

function tryApplySwap(
  colorMap: number[][],
  width: number,
  height: number,
  swap: PaletteSwap,
  reservedPositions: Set<string>,
): boolean {
  const firstKey = positionKey(swap.first);
  const secondKey = positionKey(swap.second);
  if (
    reservedPositions.has(firstKey) ||
    reservedPositions.has(secondKey) ||
    colorMap[swap.first.x][swap.first.y] !== swap.firstColor ||
    colorMap[swap.second.x][swap.second.y] !== swap.secondColor
  ) {
    return false;
  }

  colorMap[swap.first.x][swap.first.y] = swap.secondColor;
  colorMap[swap.second.x][swap.second.y] = swap.firstColor;
  if (!everySquareTouchesSameColor(colorMap, width, height)) {
    colorMap[swap.first.x][swap.first.y] = swap.firstColor;
    colorMap[swap.second.x][swap.second.y] = swap.secondColor;
    return false;
  }

  reservedPositions.add(firstKey);
  reservedPositions.add(secondKey);
  return true;
}

function tryMixSolidLineWithMixedNeighbor(
  colorMap: number[][],
  hardMap: number[][],
  width: number,
  height: number,
  lineCount: number,
  lineLength: number,
  orientation: PalettePatternOrientation,
  solidLine: number,
  mixedLine: number,
  reservedPositions: Set<string>,
): boolean {
  const solidColor = getSolidProgressionLineColor(
    colorMap,
    solidLine,
    lineLength,
    orientation,
  );
  if (
    solidColor === NO_SOLID_COLOR ||
    getSolidProgressionLineColor(
      colorMap,
      mixedLine,
      lineLength,
      orientation,
    ) !== NO_SOLID_COLOR
  ) {
    return false;
  }

  const positionsByNeighborColor = new Map<number, number[]>();
  for (
    let crossAxisPosition = FIRST_GRID_INDEX;
    crossAxisPosition < lineLength;
    crossAxisPosition += GRID_STEP
  ) {
    const position = getPhysicalGridPosition(
      mixedLine,
      crossAxisPosition,
      orientation,
    );
    const neighborColor = colorMap[position.x][position.y];
    if (neighborColor === solidColor) continue;

    const positions = positionsByNeighborColor.get(neighborColor) ?? [];
    positions.push(crossAxisPosition);
    positionsByNeighborColor.set(neighborColor, positions);
  }

  for (const [neighborColor, availablePositions] of positionsByNeighborColor) {
    if (
      availablePositions.length <= GRID_STEP ||
      !colorCanReachProgressionLine(
        hardMap,
        neighborColor,
        solidLine,
        lineCount,
        lineLength,
        orientation,
      ) ||
      !colorCanReachProgressionLine(
        hardMap,
        solidColor,
        mixedLine,
        lineCount,
        lineLength,
        orientation,
      )
    ) {
      continue;
    }

    const orderedPositions = orderPositionsBySpread(
      availablePositions,
      lineLength,
      solidLine % lineLength,
    );
    for (const firstCrossAxisPosition of orderedPositions) {
      for (const secondCrossAxisPosition of orderedPositions) {
        if (firstCrossAxisPosition === secondCrossAxisPosition) continue;

        const applied = tryApplySwap(
          colorMap,
          width,
          height,
          {
            first: getPhysicalGridPosition(
              solidLine,
              firstCrossAxisPosition,
              orientation,
            ),
            second: getPhysicalGridPosition(
              mixedLine,
              secondCrossAxisPosition,
              orientation,
            ),
            firstColor: solidColor,
            secondColor: neighborColor,
          },
          reservedPositions,
        );
        if (applied) return true;
      }
    }
  }

  return false;
}

function trySeparateAdjacentSolidLines(
  colorMap: number[][],
  hardMap: number[][],
  width: number,
  height: number,
  lineCount: number,
  lineLength: number,
  orientation: PalettePatternOrientation,
  leftLine: number,
  reservedPositions: Set<string>,
): boolean {
  const rightLine = leftLine + GRID_STEP;
  const outsideLeftLine = leftLine - GRID_STEP;
  if (
    outsideLeftLine >= FIRST_GRID_INDEX &&
    tryMixSolidLineWithMixedNeighbor(
      colorMap,
      hardMap,
      width,
      height,
      lineCount,
      lineLength,
      orientation,
      leftLine,
      outsideLeftLine,
      reservedPositions,
    )
  ) {
    return true;
  }

  const outsideRightLine = rightLine + GRID_STEP;
  return (
    outsideRightLine < lineCount &&
    tryMixSolidLineWithMixedNeighbor(
      colorMap,
      hardMap,
      width,
      height,
      lineCount,
      lineLength,
      orientation,
      rightLine,
      outsideRightLine,
      reservedPositions,
    )
  );
}

function separateAdjacentSolidLines(
  colorMap: number[][],
  hardMap: number[][],
  width: number,
  height: number,
  lineCount: number,
  lineLength: number,
  orientation: PalettePatternOrientation,
  reservedPositions: Set<string>,
): void {
  let separatedLine = true;

  while (separatedLine) {
    separatedLine = false;
    for (
      let rightLine = GRID_STEP;
      rightLine < lineCount;
      rightLine += GRID_STEP
    ) {
      const leftLine = rightLine - GRID_STEP;
      const leftColor = getSolidProgressionLineColor(
        colorMap,
        leftLine,
        lineLength,
        orientation,
      );
      const rightColor = getSolidProgressionLineColor(
        colorMap,
        rightLine,
        lineLength,
        orientation,
      );
      if (leftColor === NO_SOLID_COLOR || rightColor === NO_SOLID_COLOR) {
        continue;
      }

      if (
        trySeparateAdjacentSolidLines(
          colorMap,
          hardMap,
          width,
          height,
          lineCount,
          lineLength,
          orientation,
          leftLine,
          reservedPositions,
        )
      ) {
        separatedLine = true;
      }
    }
  }
}

export function generatePalettePatternMap({
  width,
  height,
  squareCounts,
  orientation,
  isReversed,
  blendPercent,
}: PalettePatternOptions): number[][] {
  const normalizedBlendPercent = normalizePaletteBlendPercent(blendPercent);
  const blendStrength = normalizedBlendPercent / BLEND_PERCENT_DIVISOR;
  const lineCount = orientation === "horizontal" ? width : height;
  const lineLength = orientation === "horizontal" ? height : width;
  const adjustedSquareCounts =
    normalizedBlendPercent > FIRST_GRID_INDEX
      ? rebalanceThinEdgeColorCounts(squareCounts, lineLength, blendStrength)
      : [...squareCounts];
  const colorMap = Array.from({ length: width }, () =>
    Array(height).fill(FIRST_COLOR_INDEX),
  );
  const path = buildSerpentinePath(width, height, orientation, isReversed);
  let pathIndex = FIRST_GRID_INDEX;

  for (
    let colorIndex = FIRST_COLOR_INDEX;
    colorIndex < adjustedSquareCounts.length;
    colorIndex += GRID_STEP
  ) {
    const squareCount = Math.max(
      FIRST_GRID_INDEX,
      adjustedSquareCounts[colorIndex] ?? FIRST_GRID_INDEX,
    );
    const colorEnd = Math.min(path.length, pathIndex + squareCount);
    for (; pathIndex < colorEnd; pathIndex += GRID_STEP) {
      const position = path[pathIndex];
      colorMap[position.x][position.y] = colorIndex;
    }
  }

  const fallbackColorIndex = Math.max(
    FIRST_COLOR_INDEX,
    adjustedSquareCounts.length - LAST_COLOR_OFFSET,
  );
  for (; pathIndex < path.length; pathIndex += GRID_STEP) {
    const position = path[pathIndex];
    colorMap[position.x][position.y] = fallbackColorIndex;
  }

  if (normalizedBlendPercent <= FIRST_GRID_INDEX) return colorMap;

  reinforceOuterProgressionLines(
    colorMap,
    lineCount,
    lineLength,
    orientation,
    isReversed,
    adjustedSquareCounts.length,
  );
  const hardMap = colorMap.map((column) => [...column]);
  const boundaryPlans = buildBoundaryPlans(
    hardMap,
    adjustedSquareCounts,
    lineCount,
    lineLength,
    orientation,
    isReversed,
  );
  const reservedPositions = new Set<string>();
  reserveOuterProgressionLines(
    reservedPositions,
    lineCount,
    lineLength,
    orientation,
  );

  for (const plan of boundaryPlans) {
    const activeSwapCount = Math.min(
      plan.swapCapacity,
      Math.max(
        MIN_ALIGNED_SWAP_COUNT,
        Math.round(plan.swapCapacity * blendStrength),
      ),
    );
    let appliedSwapCount = FIRST_GRID_INDEX;
    for (const swap of plan.swaps) {
      if (appliedSwapCount >= activeSwapCount) break;
      if (
        tryApplySwap(
          colorMap,
          width,
          height,
          swap,
          reservedPositions,
        )
      ) {
        appliedSwapCount += GRID_STEP;
      }
    }
  }

  if (
    normalizedBlendPercent >=
    PALETTE_BLEND_CONFIG.solidLineSeparationThresholdPercent
  ) {
    separateAdjacentSolidLines(
      colorMap,
      hardMap,
      width,
      height,
      lineCount,
      lineLength,
      orientation,
      reservedPositions,
    );
  }

  return colorMap;
}
