import {
  type CubicBezier,
  easingCurve,
  motionDuration,
} from '@repo/kit/motion';

// How long a Frame motion runs and the curve it eases along.
export interface FrameTiming {
  duration: number;
  curve: CubicBezier;
}

// What a Frame part needs to move: the change that animates, whether it may, and how.
export interface FrameMotion {
  // Only a change of key animates, so a window resize or a divider drag moves the Frame at once.
  transitionKey: string;
  animate: boolean;
  timing: FrameTiming;
}

// Every Frame change, the sidebar and the Inspector alike, runs this one motion, so the content squeezes at the pace the panes push it.
export const frameTiming: FrameTiming = {
  duration: motionDuration.frame,
  curve: easingCurve.decelerate,
};
