import type { Dot } from './core';
import type { ModeOpts } from './profiles';

export type { Dot };

// The dots a mode writes each frame. They are kept between frames, so a frame allocates no dot.
export interface DotBuffer {
  dots: Dot[];
  count: number;
}

// Writes one frame of a mode into `out`, z-sorted far to near, at `size` px.
export type ModeDraw = (
  out: DotBuffer,
  size: number,
  t: number,
  opts: ModeOpts,
) => void;
