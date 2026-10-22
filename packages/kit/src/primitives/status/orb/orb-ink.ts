'worklet';

const channelMax = 255;

// Dots fainter than this are skipped, as the original skips them.
export const minAlpha = 0.02;

// The smallest dot, in px, when a mode sets none: the original's default.
export const defaultRMin = 0.3;

// A dot's grey from 0 to 1, in the original's 256 steps. On dark themes the ink is mirrored, so near dots read bright.
export function inkLevel(white: number, dark: boolean): number {
  const w = Math.min(1, Math.max(0, white));

  return Math.round((dark ? 1 - w : w) * channelMax) / channelMax;
}
