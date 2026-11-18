import type { Dot, DotBuffer } from './engine/types';
import { inkLevel, minAlpha } from './orb-ink';

export interface Painted {
  count: number;
  sum: number;
}

// The same weighting the original's sums were taken with.
function score(dot: Dot, rMin: number): number {
  const position = dot.x + 2 * dot.y;
  const radius = 3 * Math.max(rMin, dot.r);

  return position + radius + 5 * inkLevel(dot.white, false) + 7 * dot.a;
}

// What a frame paints on a light page: the dots dark enough to draw, and a sum over their position, radius, grey and alpha.
export function paintedFrame(buffer: DotBuffer, rMin: number): Painted {
  const painted = buffer.dots
    .slice(0, buffer.count)
    .filter((dot) => dot.a >= minAlpha);

  const sum = painted.reduce((total, dot) => total + score(dot, rMin), 0);

  return { count: painted.length, sum };
}
