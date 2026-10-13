// Animation lengths in milliseconds.
export const motionDuration = {
  enter: 200,
  exit: 150,
  tooltipEnter: 150,
  enterDelay: 50,
  expand: 250,
  collapse: 200,
  shellPane: 280,
};

// Cubic Bézier control points, as CSS `cubic-bezier(x1, y1, x2, y2)` takes them.
export const easingCurve = {
  // Starts fast and settles gently, for panes that open or close.
  decelerate: { x1: 0.22, y1: 1, x2: 0.36, y2: 1 },
  // The ease iOS uses when a transparent header gains its scroll edge.
  standard: { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 },
};

export type CubicBezier = (typeof easingCurve)[keyof typeof easingCurve];

// A motion length and curve as the Web Animations API and CSS take them.
export function cssTransition(
  duration: number,
  { x1, y1, x2, y2 }: CubicBezier,
): { duration: number; easing: string } {
  return { duration, easing: `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})` };
}

export const fullTurnDegrees = 360;
export const quarterTurnDegrees = 90;
