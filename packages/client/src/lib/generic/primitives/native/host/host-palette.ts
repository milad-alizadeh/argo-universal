import type { MaterialColors, RgbaHex } from '@expo/ui/jetpack-compose';
import { processColor } from 'react-native';
import type { HostThemeProps } from './host-theme-props';

// Resolve once for both Expo's JS consumers (including FieldGroup.Section) and Compose.
const roleTokens = [
  ['primary', 'accent'],
  ['onPrimary', 'primaryForeground'],
  ['primaryContainer', 'muted'],
  ['onPrimaryContainer', 'foreground'],
  ['inversePrimary', 'card'],
  ['secondary', 'accent'],
  ['onSecondary', 'primaryForeground'],
  ['secondaryContainer', 'muted'],
  ['onSecondaryContainer', 'foreground'],
  ['tertiary', 'accent'],
  ['onTertiary', 'primaryForeground'],
  ['tertiaryContainer', 'muted'],
  ['onTertiaryContainer', 'foreground'],
  ['background', 'content'],
  ['onBackground', 'foreground'],
  ['surface', 'card'],
  ['onSurface', 'foreground'],
  ['surfaceVariant', 'muted'],
  ['onSurfaceVariant', 'mutedForeground'],
  ['surfaceTint', 'accent'],
  ['inverseSurface', 'foreground'],
  ['inverseOnSurface', 'card'],
  ['error', 'danger'],
  ['onError', 'primaryForeground'],
  ['errorContainer', 'muted'],
  ['onErrorContainer', 'danger'],
  ['outline', 'border'],
  ['outlineVariant', 'border'],
  ['surfaceBright', 'card'],
  ['surfaceDim', 'content'],
  ['surfaceContainer', 'card'],
  ['surfaceContainerHigh', 'muted'],
  ['surfaceContainerHighest', 'muted'],
  ['surfaceContainerLow', 'content'],
  ['surfaceContainerLowest', 'content'],
] as const satisfies readonly (readonly [
  keyof MaterialColors,
  keyof HostThemeProps['colors'],
])[];

export function materialPalette(
  base: MaterialColors,
  colors: HostThemeProps['colors'],
): MaterialColors {
  const palette = { ...base };

  for (const [role, token] of roleTokens) {
    const color = rgbaHex(colors[token]);

    if (color !== undefined) palette[role] = color;
  }

  return palette;
}

const bitsPerByte = 8;

const rgbBits = 24;

const hexRadix = 16;

const rgbaHexLength = 8;

function rgbaHex(token: string | undefined): RgbaHex | undefined {
  const argb = token === undefined ? undefined : processColor(token);

  if (typeof argb !== 'number') return undefined;

  // React Native returns ARGB; Expo's JS palette uses #RRGGBBAA.
  const rgba = ((argb << bitsPerByte) | (argb >>> rgbBits)) >>> 0;

  return `#${rgba.toString(hexRadix).padStart(rgbaHexLength, '0').toUpperCase()}`;
}
