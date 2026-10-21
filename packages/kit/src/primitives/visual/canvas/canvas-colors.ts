import type { NativeTheme } from '../../../native-theme';
import type { CanvasDrawing } from './canvas-props';
import { skiaColor } from './canvas-srgb';

type Tone = NonNullable<CanvasDrawing['props']['tone']>;

function semanticColors({
  colors,
}: NativeTheme): Record<Tone, string | undefined> {
  return {
    neutral: colors.foreground,
    muted: colors.mutedForeground,
    accent: colors.accent,
    info: colors.info,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    done: colors.done,
  };
}

function toneShade(
  props: CanvasDrawing['props'],
  theme: NativeTheme,
): string | undefined {
  const shades = theme.toneShades[toneOf(props)] ?? [];
  const index = Math.round((props.intensity ?? 0) * (shades.length - 1));

  return shades[index];
}

function tokenColor(
  props: CanvasDrawing['props'],
  theme: NativeTheme,
): string | undefined {
  if (props.intensity !== undefined) return toneShade(props, theme);

  return semanticColors(theme)[props.tone ?? 'neutral'];
}

export function drawingColor(
  props: CanvasDrawing['props'],
  theme: NativeTheme,
): string | undefined {
  const token = tokenColor(props, theme);

  return token ? skiaColor(token) : undefined;
}

const toneOf = (props: CanvasDrawing['props']): Tone => props.tone ?? 'neutral';
