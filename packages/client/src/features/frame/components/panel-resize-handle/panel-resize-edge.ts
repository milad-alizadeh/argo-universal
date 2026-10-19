// How far one arrow key or accessibility action moves the edge, in points.
export const keyboardStep = 16;

// The grip lies outside the panel it resizes, in the gutter beside its edge, so it never covers the panel's own edge.
export function edgeClassName(edge: 'left' | 'right' = 'right'): string {
  return `absolute ${edge === 'left' ? '-left-2' : '-right-2'} bottom-0 top-frame-bar z-10 w-2`;
}
