import type { NativeTheme } from '#kit/native-theme';

type Colors = NativeTheme['colors'];

// A colour is missing only while Uniwind has not resolved its token.
type Role = string | undefined;

interface SurfaceRoles {
  primary: Role;
  onPrimary: Role;
  secondaryContainer: Role;
  onSecondaryContainer: Role;
  surface: Role;
  surfaceContainer: Role;
  onSurface: Role;
  onSurfaceVariant: Role;
  outline: Role;
  outlineVariant: Role;
}

interface StateRoles {
  error: Role;
  onError: Role;
  // Argo's accent, not a Material role: focus, the switch track and dialog answers.
  accent: Role;
  // Argo's selection tint, in place of Material's secondary container on chips and drawer items.
  selected: Role;
  /*
   * A navigation rail's active indicator: Material's secondary container is muted, which matches the content surface
   * the rail sits on, so the rail takes tint, the fill that shows on it.
   */
  indicator: Role;
  // Argo's pressed tint, the colour of every press ripple in place of Material's state layer.
  pressed: Role;
  disabledContent: Role;
  disabledContainer: Role;
  scrim: Role;
}

export type MaterialRoles = SurfaceRoles & StateRoles;

/*
 * Material 3's colour roles, each bound to an Argo token. Expo's Host builds a tonal palette from the
 * seed, which turns a grey accent teal, so Android controls take these roles through their own
 * `colors` props instead. Material's monochrome scheme guides which token fills which role.
 */
export function materialRoles(colors: Colors): MaterialRoles {
  return { ...surfaceRoles(colors), ...stateRoles(colors) };
}

function surfaceRoles(colors: Colors): SurfaceRoles {
  return {
    primary: colors.primary,
    onPrimary: colors.primaryForeground,
    secondaryContainer: colors.muted,
    onSecondaryContainer: colors.foreground,
    surface: colors.content,
    surfaceContainer: colors.card,
    onSurface: colors.foreground,
    onSurfaceVariant: colors.mutedForeground,
    outline: colors.mutedForeground,
    outlineVariant: colors.border,
  };
}

function stateRoles(colors: Colors): StateRoles {
  return {
    error: colors.danger,
    onError: colors.primaryForeground,
    accent: colors.accent,
    selected: colors.selected,
    indicator: colors.tint,
    pressed: colors.pressed,
    disabledContent: colors.disabledContent,
    disabledContainer: colors.disabledContainer,
    scrim: colors.scrim,
  };
}
