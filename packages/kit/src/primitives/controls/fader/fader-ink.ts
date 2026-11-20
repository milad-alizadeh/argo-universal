export type Ink = 'dark' | 'light';

// The ends of the sRGB curve: the linear part below the knee, the power part above it.
const srgb = {
  knee: 0.040_45,
  slope: 12.92,
  offset: 0.055,
  scale: 1.055,
  gamma: 2.4,
};

const weights = { red: 0.2126, green: 0.7152, blue: 0.0722 };

const maxChannel = 255;

// Where each channel's two hex digits start in `#RRGGBB`.
const at = { red: 1, green: 3, blue: 5 };

const hexBase = 16;

// An 8-bit channel as linear light.
function linear(channel: number): number {
  const share = channel / maxChannel;

  return share <= srgb.knee
    ? share / srgb.slope
    : ((share + srgb.offset) / srgb.scale) ** srgb.gamma;
}

// The channel at `at` in `#RRGGBB`, as linear light.
const channelAt = (hex: string, at: number): number =>
  linear(Number.parseInt(hex.slice(at, at + 2), hexBase));

// The relative luminance, 0 to 1, of a colour as `#RRGGBB`.
export function luminanceOf(hex: string): number {
  return (
    weights.red * channelAt(hex, at.red) +
    weights.green * channelAt(hex, at.green) +
    weights.blue * channelAt(hex, at.blue)
  );
}

/*
 * Content reads against the fill's colours together, so the average of their luminance decides. Dark ink has the better
 * contrast above 0.179 and light ink below it (the luminance where black and white contrast equally).
 */
const darkInkAbove = 0.179;

export function inkOver(colours: readonly string[]): Ink {
  const lights = colours.map(luminanceOf);
  const average = lights.reduce((sum, light) => sum + light, 0) / lights.length;

  return average > darkInkAbove ? 'dark' : 'light';
}
