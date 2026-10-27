/*
 * A tracker label's own colour, as the Pill draws it: the text in that colour, mixed toward black on a light theme and
 * toward white on a dark one until it reads, over a fill of the colour itself at the alpha the tone fills use. A colour
 * as light as a light page, or as dark as a dark one, would leave no fill, so that Pill keeps its tone's. A grey label,
 * black and white among them, has no hue to show, so it draws as a plain Pill.
 */
export interface LabelColours {
  text: string;
  fill: string | undefined;
}

type Rgb = readonly [red: number, green: number, blue: number];

// The perceived luminance text keeps to: at most this on a light theme, at least this on a dark one.
const readable = { light: 0.09, dark: 0.5 } as const;

// Beyond these a fill of the colour vanishes into the page.
const vanishes = { light: 0.85, dark: 0.04 } as const;

// The spread between a colour's strongest and weakest channel below which it reads as grey.
const greyChroma = 0.15;

// How much further toward black or white each try mixes the text.
const mixStep = 0.02;

// The fill's alpha as two hex digits: 18%, light enough for the coloured text to read on it.
const fillAlpha = '2e';

const hex = { base: 16, digits: 2, channelMax: 255 } as const;

// sRGB's transfer curve and the luminance weights, as WCAG 2 defines them.
const srgb = {
  knee: 0.04045,
  slope: 12.92,
  offset: 0.055,
  scale: 1.055,
  gamma: 2.4,
} as const;

const weights = { red: 0.2126, green: 0.7152, blue: 0.0722 } as const;

const channel = (color: string, index: number): number => {
  const start = 1 + index * hex.digits;

  return (
    Number.parseInt(color.slice(start, start + hex.digits), hex.base) /
    hex.channelMax
  );
};

const channels = (color: string): Rgb => [
  channel(color, 0),
  channel(color, 1),
  channel(color, 2),
];

const linear = (value: number): number =>
  value <= srgb.knee
    ? value / srgb.slope
    : ((value + srgb.offset) / srgb.scale) ** srgb.gamma;

const luminance = ([red, green, blue]: Rgb): number =>
  weights.red * linear(red) +
  weights.green * linear(green) +
  weights.blue * linear(blue);

const mix = (rgb: Rgb, target: number, amount: number): Rgb => [
  rgb[0] + (target - rgb[0]) * amount,
  rgb[1] + (target - rgb[1]) * amount,
  rgb[2] + (target - rgb[2]) * amount,
];

const grey = (rgb: Rgb): boolean =>
  Math.max(...rgb) - Math.min(...rgb) < greyChroma;

const fills = (rgb: Rgb, dark: boolean): boolean =>
  dark ? luminance(rgb) > vanishes.dark : luminance(rgb) < vanishes.light;

const reads = (rgb: Rgb, dark: boolean): boolean =>
  dark ? luminance(rgb) >= readable.dark : luminance(rgb) <= readable.light;

// Mixes the colour toward white on a dark theme, or black on a light one, until it reads.
function readableText(rgb: Rgb, dark: boolean): Rgb {
  // White is 1 and black 0 in every channel.
  const target = Number(dark);
  let amount = 0;

  while (!reads(mix(rgb, target, amount), dark) && amount < 1)
    amount = Math.min(1, amount + mixStep);

  return mix(rgb, target, amount);
}

const hexDigits = (value: number): string =>
  Math.round(value * hex.channelMax)
    .toString(hex.base)
    .padStart(hex.digits, '0');

const toHex = (rgb: Rgb): string => `#${rgb.map(hexDigits).join('')}`;

export function labelColours(
  color: string,
  dark: boolean,
): LabelColours | undefined {
  const rgb = channels(color);

  if (grey(rgb)) return undefined;

  return {
    text: toHex(readableText(rgb, dark)),
    fill: fills(rgb, dark) ? `${color}${fillAlpha}` : undefined,
  };
}
