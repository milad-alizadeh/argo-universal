// How far one arrow key or accessibility action moves the edge, in points.
export const keyboardStep = 16;

export function edgeClassName(edge: 'left' | 'right' = 'right'): string {
  return `absolute ${edge === 'left' ? '-left-1' : '-right-1'} bottom-0 top-frame-bar z-10 w-2`;
}
