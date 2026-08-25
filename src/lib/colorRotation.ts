export interface ColorRotationState {
  isRotated: boolean;
  isReversed: boolean;
}

const COLOR_ROTATION_QUARTER_TURN_DEGREES = 90;
const COLOR_ROTATION_REVERSED_QUARTER_TURNS = 2;

export const getColorRotationDegrees = ({
  isRotated,
  isReversed,
}: ColorRotationState): number =>
  ((isReversed ? COLOR_ROTATION_REVERSED_QUARTER_TURNS : 0) +
    (isRotated ? 1 : 0)) *
  COLOR_ROTATION_QUARTER_TURN_DEGREES;

export const getNextColorRotationState = ({
  isRotated,
  isReversed,
}: ColorRotationState): ColorRotationState => ({
  isRotated: !isRotated,
  isReversed: isRotated ? !isReversed : isReversed,
});
