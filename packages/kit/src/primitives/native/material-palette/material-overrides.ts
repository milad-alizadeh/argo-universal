import type { MaterialColors } from '@expo/ui/jetpack-compose';
import { processColor } from 'react-native';
import type { NativeTheme } from '#kit/native-theme';

type Colors = NativeTheme['colors'];

// A token is missing only while Uniwind has not resolved it; the Host keeps the seeded role then.
type Roles = Partial<Record<keyof MaterialColors, string | undefined>>;

/*
 * The Material 3 roles the Host's `colorOverrides` replaces, each bound to an Argo token. Material's
 * monochrome scheme guides which token fills which role. Compose components read their default colours
 * from these roles, so a control needs its own `colors` only where Argo departs from Material's default.
 */
export function materialColorOverrides(
  colors: Colors,
): Partial<MaterialColors> {
  const roles: Roles = {
    ...accentRoles(colors),
    ...surfaceRoles(colors),
    ...containerRoles(colors),
    ...lineAndStateRoles(colors),
  };

  return rgbaRoles(roles);
}

function accentRoles(colors: Colors): Roles {
  return {
    primary: colors.primary,
    onPrimary: colors.primaryForeground,
    primaryContainer: colors.muted,
    onPrimaryContainer: colors.foreground,
    secondary: colors.primary,
    onSecondary: colors.primaryForeground,
    secondaryContainer: colors.muted,
    onSecondaryContainer: colors.foreground,
  };
}

function surfaceRoles(colors: Colors): Roles {
  return {
    background: colors.content,
    onBackground: colors.foreground,
    surface: colors.content,
    onSurface: colors.foreground,
    surfaceVariant: colors.muted,
    onSurfaceVariant: colors.mutedForeground,
    inverseSurface: colors.foreground,
    inverseOnSurface: colors.content,
  };
}

// Menus, dialogs and cards sit on the card fill; sheets on the content surface; filled fields and tracks on muted.
function containerRoles(colors: Colors): Roles {
  return {
    surfaceContainerLowest: colors.card,
    surfaceContainerLow: colors.content,
    surfaceContainer: colors.card,
    surfaceContainerHigh: colors.card,
    surfaceContainerHighest: colors.muted,
    surfaceBright: colors.card,
    surfaceDim: colors.muted,
  };
}

// Material draws its scrim at 32% of the scrim role, so the role is the full foreground.
function lineAndStateRoles(colors: Colors): Roles {
  return {
    outline: colors.mutedForeground,
    outlineVariant: colors.border,
    error: colors.danger,
    onError: colors.primaryForeground,
    scrim: colors.foreground,
  };
}

type RgbaHex = MaterialColors[keyof MaterialColors];

const hexRadix = 16;

// Eight hex digits: alpha, red, green, blue.
const argbDigits = 8;

// The roles in Expo's `#RRGGBBAA` form; a token not yet resolved is left out, so the seeded role stays.
function rgbaRoles(roles: Roles): Partial<MaterialColors> {
  const entries = Object.entries(roles).flatMap(([role, color]) => {
    const hex = color === undefined ? undefined : rgbaHex(color);

    return hex === undefined ? [] : [[role, hex] as const];
  });

  return Object.fromEntries(entries);
}

// processColor gives `0xAARRGGBB`; Expo's palette writes `#RRGGBBAA`.
function rgbaHex(color: string): RgbaHex | undefined {
  const argb = processColor(color);

  if (typeof argb !== 'number') return undefined;

  const hex = (argb >>> 0).toString(hexRadix).padStart(argbDigits, '0');

  return `#${(hex.slice(2) + hex.slice(0, 2)).toUpperCase()}`;
}
