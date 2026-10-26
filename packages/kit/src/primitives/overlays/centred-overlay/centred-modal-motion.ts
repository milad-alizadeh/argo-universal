import { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { motionDuration } from '#kit/motion';

// The backdrop and the centred card fade in and out together.
export const scrimEntering = FadeIn.duration(motionDuration.enter).reduceMotion(
  ReduceMotion.System,
);

export const cardEntering = FadeIn.delay(
  motionDuration.enterDelay,
).reduceMotion(ReduceMotion.System);

export const modalExiting = FadeOut.duration(motionDuration.exit).reduceMotion(
  ReduceMotion.System,
);
