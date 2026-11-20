import { canvasRgbOf } from './canvas-rgb';

/*
 * The band mixes the theme's colours on the UI thread, so it needs them as numbers. A phone reports the palette as hex
 * or `rgb()`, which are read here; the web reports it as `oklch()`, which the browser itself turns into red, green and
 * blue (`canvas-rgb.web.ts`). A colour is three numbers from 0 to 255: red, green, blue.
 */
export type Rgb = readonly number[];

const channelCount = 3;

const radix = 16;

const hexChannels = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})/iu;

const rgbFunction = /^rgba?\(([^)]*)\)/iu;

const separators = /[\s,/]+/u;

const hexOf = (css: string): Rgb | undefined =>
  hexChannels
    .exec(css.trim())
    ?.slice(1)
    .map((digits) => Number.parseInt(digits, radix));

const numbersIn = (css: string): number[] =>
  (rgbFunction.exec(css.trim())?.[1] ?? '')
    .split(separators)
    .filter((part) => part !== '')
    .map(Number.parseFloat);

const channelsOf = (numbers: number[]): Rgb | undefined =>
  numbers.length < channelCount ? undefined : numbers.slice(0, channelCount);

// A theme colour as red, green and blue, or nothing for a string that is none of the forms above.
export const rgbOf = (css: string): Rgb | undefined =>
  hexOf(css) ?? channelsOf(numbersIn(css)) ?? canvasRgbOf(css);

export function mixRgb(from: Rgb, to: Rgb, share: number): Rgb {
  'worklet';

  return from.map(
    (channel, index) => channel + ((to[index] ?? channel) - channel) * share,
  );
}

// The colour function's name, so a colour is only ever written from the theme's own channels.
const colourFunction = 'rgba';

const alphaDigits = 3;

/*
 * A theme colour with its strength as a CSS colour, for a bar's background. A packed number would be lighter, but the web
 * does not read one in an animated style.
 */
export function cssColourOf(colour: Rgb, strength: number): string {
  'worklet';

  const [red, green, blue] = colour.map(Math.round);
  const alpha = Math.min(1, Math.max(0, strength)).toFixed(alphaDigits);

  return `${colourFunction}(${red}, ${green}, ${blue}, ${alpha})`;
}
