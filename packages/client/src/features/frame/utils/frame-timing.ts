import {
  type CubicBezier,
  easingCurve,
  motionDuration,
} from '#lib/generic/motion';

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

const paneTiming: FrameTiming = {
  duration: motionDuration.framePane,
  curve: easingCurve.decelerate,
};

const sidebarTimings = {
  expand: { duration: motionDuration.expand, curve: easingCurve.easeOut },
  collapse: { duration: motionDuration.collapse, curve: easingCurve.easeOut },
} satisfies Record<string, FrameTiming>;

// Collapsing the sidebar takes the shorter exit and expanding it the longer enter; any other Frame change, such as the Inspector, keeps the pane motion.
export function frameTiming(
  sidebarShownBefore: boolean,
  sidebarShown: boolean,
): FrameTiming {
  if (sidebarShownBefore === sidebarShown) return paneTiming;

  return sidebarShown ? sidebarTimings.expand : sidebarTimings.collapse;
}
