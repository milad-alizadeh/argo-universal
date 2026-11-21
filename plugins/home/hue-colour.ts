/*
 * Colour as the wheel and Hue each speak it: the wheel gives hue (0-359) and saturation (0-100); Hue takes a CIE xy
 * point inside the gamut the light reports. The matrices are Philips Hue's published wide-gamut RGB conversion.
 */
export type Point = Readonly<{ x: number; y: number }>;

export type Gamut = Readonly<{ red: Point; green: Point; blue: Point }>;

export type Rgb = readonly [number, number, number];

// Gamut C, which Hue says to assume for a light that reports none.
export const defaultGamut: Gamut = {
  red: { x: 0.6915, y: 0.3083 },
  green: { x: 0.17, y: 0.7 },
  blue: { x: 0.1532, y: 0.0475 },
};

const white: Point = { x: 0.3127, y: 0.329 };

const gamma = {
  encodeThreshold: 0.0031308,
  decodeThreshold: 0.04045,
  slope: 12.92,
  scale: 1.055,
  offset: 0.055,
  exponent: 2.4,
};

const toGamma = (value: number): number =>
  value <= gamma.encodeThreshold
    ? gamma.slope * value
    : gamma.scale * value ** (1 / gamma.exponent) - gamma.offset;

const fromGamma = (value: number): number =>
  value > gamma.decodeThreshold
    ? ((value + gamma.offset) / gamma.scale) ** gamma.exponent
    : value / gamma.slope;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const xyzToRgb = {
  red: { a: 1.656492, b: -0.354851, c: -0.255038 },
  green: { a: -0.707196, b: 1.655397, c: 0.036152 },
  blue: { a: 0.051713, b: -0.121364, c: 1.01153 },
};

const rgbToXyz = {
  x: { a: 0.664511, b: 0.154324, c: 0.162028 },
  y: { a: 0.283881, b: 0.668433, c: 0.047685 },
  z: { a: 0.000088, b: 0.07231, c: 0.986039 },
};

const dot = (
  { a, b, c }: { a: number; b: number; c: number },
  [x, y, z]: Rgb,
): number => a * x + b * y + c * z;

export function xyToRgb({ x, y }: Point): Rgb {
  if (y <= 0) return [1, 1, 1];

  const xyz: Rgb = [x / y, 1, (1 - x - y) / y];

  const linear = Object.values(xyzToRgb).map((row) =>
    Math.max(0, dot(row, xyz)),
  );

  const top = Math.max(1, ...linear);

  const [r = 0, g = 0, b = 0] = linear.map((value) =>
    clamp01(toGamma(value / top)),
  );

  return [r, g, b];
}

export function rgbToXy([r, g, b]: Rgb): Point {
  const [lr = 0, lg = 0, lb = 0] = [r, g, b].map(fromGamma);
  const linear: Rgb = [lr, lg, lb];
  const bigX = dot(rgbToXyz.x, linear);
  const bigY = dot(rgbToXyz.y, linear);
  const bigZ = dot(rgbToXyz.z, linear);
  const sum = bigX + bigY + bigZ;

  return sum <= 0 ? white : { x: bigX / sum, y: bigY / sum };
}

const fullTurn = 360;

const sectors = 6;

const degreesPerSector = fullTurn / sectors;

const fullPercent = 100;

const channelOffsets = { red: 5, green: 3, blue: 1 };

const channelPlateauEnd = 4;

const greenSector = 2;

const blueSector = 4;

export type HueSaturation = { hue: number; saturation: number };

// The wheel's point: full value, so brightness stays the slider's.
export function hueSaturationToRgb(hue: number, saturation: number): Rgb {
  const s = saturation / fullPercent;
  const sector = (hue % fullTurn) / degreesPerSector;

  const channel = (offset: number): number => {
    const k = (offset + sector) % sectors;

    return 1 - s * Math.max(0, Math.min(k, channelPlateauEnd - k, 1));
  };

  return [
    channel(channelOffsets.red),
    channel(channelOffsets.green),
    channel(channelOffsets.blue),
  ];
}

export function rgbToHueSaturation([r, g, b]: Rgb): HueSaturation {
  const max = Math.max(r, g, b);
  const spread = max - Math.min(r, g, b);

  const degrees = (): number => {
    if (max === r) return ((g - b) / spread + sectors) % sectors;

    return max === g
      ? (b - r) / spread + greenSector
      : (r - g) / spread + blueSector;
  };

  return {
    hue: spread === 0 ? 0 : Math.round(degrees() * degreesPerSector) % fullTurn,
    saturation: max === 0 ? 0 : Math.round((spread / max) * fullPercent),
  };
}

const sign = (a: Point, b: Point, c: Point): number =>
  (a.x - c.x) * (b.y - c.y) - (b.x - c.x) * (a.y - c.y);

function inside(point: Point, { red, green, blue }: Gamut): boolean {
  const signs = [
    sign(point, red, green),
    sign(point, green, blue),
    sign(point, blue, red),
  ];

  return signs.every((each) => each >= 0) || signs.every((each) => each <= 0);
}

function nearestOnSegment(point: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  const t = clamp01(
    ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy),
  );

  return { x: a.x + t * dx, y: a.y + t * dy };
}

const distance = (a: Point, b: Point): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

// A point the light cannot show moves to the nearest one it can.
export function withinGamut(point: Point, gamut: Gamut): Point {
  if (inside(point, gamut)) return point;
  const { red, green, blue } = gamut;

  return [
    nearestOnSegment(point, green, blue),
    nearestOnSegment(point, blue, red),
  ].reduce(
    (best, each) =>
      distance(point, each) < distance(point, best) ? each : best,
    nearestOnSegment(point, red, green),
  );
}

const maxChannel = 255;

const hexRadix = 16;

const hex = (value: number): string =>
  Math.round(value * maxChannel)
    .toString(hexRadix)
    .padStart(2, '0');

export const toHex = ([r, g, b]: Rgb): string => `#${hex(r)}${hex(g)}${hex(b)}`;

const kelvinFit = {
  min: 1000,
  max: 40_000,
  perMirek: 1_000_000,
  scale: 100,
  warmLimit: 66,
  blueThreshold: 19,
  red: { offset: 60, scale: 329.698727446, exponent: -0.1332047592 },
  warmGreen: { scale: 99.4708025861, offset: 161.1195681661 },
  coolGreen: { offset: 60, scale: 288.1221695283, exponent: -0.0755148492 },
  blue: { offset: 10, scale: 138.5177312231, intercept: 305.0447927307 },
};

// A white scene's colour from its mirek (reciprocal megakelvin), by Tanner Helland's approximation.
export function mirekToRgb(mirek: number): Rgb {
  const fit = kelvinFit;

  const kelvin =
    Math.min(fit.max, Math.max(fit.min, fit.perMirek / mirek)) / fit.scale;

  const warm = kelvin <= fit.warmLimit;

  const red = warm
    ? maxChannel
    : fit.red.scale * (kelvin - fit.red.offset) ** fit.red.exponent;

  const green = warm
    ? fit.warmGreen.scale * Math.log(kelvin) - fit.warmGreen.offset
    : fit.coolGreen.scale *
      (kelvin - fit.coolGreen.offset) ** fit.coolGreen.exponent;

  const warmBlue =
    kelvin <= fit.blueThreshold
      ? 0
      : fit.blue.scale * Math.log(kelvin - fit.blue.offset) -
        fit.blue.intercept;

  const blue = kelvin >= fit.warmLimit ? maxChannel : warmBlue;

  return [
    clamp01(red / maxChannel),
    clamp01(green / maxChannel),
    clamp01(blue / maxChannel),
  ];
}
