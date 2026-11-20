import type { Rgb } from './band-colour';

// A phone reports its colours as hex or `rgb()`, which `band-colour.ts` reads itself.
export const canvasRgbOf = (_css: string): Rgb | undefined => undefined;
