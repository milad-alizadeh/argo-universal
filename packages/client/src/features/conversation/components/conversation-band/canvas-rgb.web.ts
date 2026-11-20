import type { Rgb } from './band-colour';

const channelCount = 3;

/*
 * Any colour the browser understands, `oklch()` included, as red, green and blue: it paints one pixel of it and reads
 * the pixel back. Run when the theme changes, never per frame.
 */
export function canvasRgbOf(css: string): Rgb | undefined {
  if (!CSS.supports('color', css)) return undefined;

  const context = document
    .createElement('canvas')
    .getContext('2d', { willReadFrequently: true });

  if (!context) return undefined;

  context.fillStyle = css;
  context.fillRect(0, 0, 1, 1);

  const { data } = context.getImageData(0, 0, 1, 1);

  return [...data].slice(0, channelCount);
}
