import { formatHex8, parse } from 'culori';

const remSize = 16;
const lengthPattern = /^([+-]?(?:\d*\.\d+|\d+))(rem|px)?$/;
const shadowColorPattern =
  /\b(?:rgba?|hsla?|oklab|oklch|lab|lch|hwb|color)\([^()]*\)/g;
const shadowRemPattern = /(?<![\w.#-])([+-]?(?:\d*\.\d+|\d+))rem\b/g;

export function toNativeTokenValue(
  name: string,
  value: string,
): string | number {
  if (name === '--radius' || name.startsWith('--radius-')) {
    const length = lengthPattern.exec(value.trim());
    if (length) {
      return Number(length[1]) * (length[2] === 'rem' ? remSize : 1);
    }
  }

  if (name === '--shadow' || name.startsWith('--shadow-')) {
    return value
      .replace(shadowColorPattern, (color) => {
        const parsedColor = parse(color);
        if (!parsedColor) {
          throw new Error(`Invalid theme shadow colour: ${color}`);
        }
        return formatHex8(parsedColor);
      })
      .replace(
        shadowRemPattern,
        (_length, amount: string) => `${Number(amount) * remSize}px`,
      );
  }

  return value;
}
