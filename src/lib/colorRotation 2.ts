export interface ColorRotationState {
  isRotated: boolean;
  isReversed: boolean;
}

export const getNextColorRotationState = ({
  isRotated,
  isReversed,
}: ColorRotationState): ColorRotationState => ({
  isRotated: !isRotated,
  isReversed: isRotated ? !isReversed : isReversed,
});
