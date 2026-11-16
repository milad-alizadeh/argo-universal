import {
  type DiagramPalette,
  type DiagramTone,
  diagramTones,
} from '@repo/contracts/kit-diagram';
import { useMemo } from 'react';
import { type NativeTheme, useNativeTheme } from '#kit/native-theme';

type Colors = NativeTheme['colors'];

type RoleColors = Required<
  Pick<Colors, 'card' | 'foreground' | 'mutedForeground' | 'muted' | 'border'>
>;

// A node's tone: its quietest shade fills it, the middle one outlines it, the strongest writes on it. Dark mode reverses the ramp (ADR-0026).
const shadeIndex = { fill: 0, stroke: 4, text: 8 } as const;

const shadeAt = (shades: string[], index: number): string =>
  shades[index] ?? '';

function toneColours(
  theme: NativeTheme,
  tone: DiagramTone,
): DiagramPalette['tones'][DiagramTone] {
  const shades = theme.toneShades[tone] ?? [];

  const colours = {
    fill: shadeAt(shades, shadeIndex.fill),
    stroke: shadeAt(shades, shadeIndex.stroke),
    text: shadeAt(shades, shadeIndex.text),
  };

  return Object.values(colours).every(Boolean) ? colours : undefined;
}

const tones = (theme: NativeTheme): DiagramPalette['tones'] =>
  Object.fromEntries(
    diagramTones.map((tone) => [tone, toneColours(theme, tone)]),
  );

// Uniwind resolves the tokens together, so they are all missing only before the theme loads.
const isResolved = (colors: Colors): colors is Colors & RoleColors =>
  [
    colors.card,
    colors.foreground,
    colors.mutedForeground,
    colors.muted,
    colors.border,
  ].every(Boolean);

function roles(colors: RoleColors): Omit<DiagramPalette, 'tones'> {
  return {
    background: colors.card,
    text: colors.foreground,
    textSecondary: colors.mutedForeground,
    textMuted: colors.mutedForeground,
    line: colors.mutedForeground,
    arrow: colors.foreground,
    nodeFill: colors.muted,
    nodeStroke: colors.border,
    groupHeader: colors.muted,
    innerStroke: colors.border,
  };
}

export function useDiagramPalette(): DiagramPalette | undefined {
  const theme = useNativeTheme({ toneShades: true });

  return useMemo(
    () =>
      isResolved(theme.colors)
        ? { ...roles(theme.colors), tones: tones(theme) }
        : undefined,
    [theme],
  );
}
