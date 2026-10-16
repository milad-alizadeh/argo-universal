import { FadeOut, ReduceMotion } from 'react-native-reanimated';
import { motionDuration } from '#lib/generic/motion';

// The backdrop and the centred content fade out together.
export const dialogExiting = FadeOut.duration(motionDuration.exit).reduceMotion(
  ReduceMotion.System,
);
