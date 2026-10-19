import { useMemo } from 'react';
import { useCSSVariable, useUniwind } from 'uniwind';
import { usePrimitiveColor } from '#primitives/native/primitive-color';

const colorTokens = [
  ['accent', '--color-accent'],
  ['foreground', '--color-foreground'],
  ['muted', '--color-muted'],
  ['mutedForeground', '--color-muted-foreground'],
  ['tertiary', '--color-tertiary'],
  ['card', '--color-card'],
  ['content', '--color-content'],
  ['primary', '--color-primary'],
  ['primaryForeground', '--color-primary-foreground'],
  ['border', '--color-border'],
  ['selected', '--color-selected'],
  ['tint', '--color-tint'],
  ['pressed', '--color-pressed'],
  ['danger', '--color-danger'],
  ['warning', '--color-warning'],
] as const;

const tokenNames = colorTokens.map(([, name]) => name);

type TokenRole = (typeof colorTokens)[number][0];

// Material's disabled content (38%) and container (12%), and the sheet scrim (32%), over the foreground.
type DerivedRole = 'disabledContent' | 'disabledContainer' | 'scrim';

// A colour is missing only while Uniwind has not resolved its token.
type NativeColors = Partial<Record<TokenRole | DerivedRole, string>>;

export interface NativeTheme {
  colorScheme: 'light' | 'dark';
  colors: NativeColors;
}

// Argo's tokens for native controls, re-resolved whenever the theme or Appearance changes.
export function useNativeTheme(): NativeTheme {
  const { theme } = useUniwind();
  const tokens = useCSSVariable(tokenNames);
  const derived = useDerivedColors();

  const colors = useMemo(
    () => ({ ...tokenColors(tokens), ...derived }),
    [tokens, derived],
  );

  return { colorScheme: theme === 'dark' ? 'dark' : 'light', colors };
}

function useDerivedColors(): Partial<Record<DerivedRole, string>> {
  const disabledContent = usePrimitiveColor('text-foreground/38');
  const disabledContainer = usePrimitiveColor('text-foreground/12');
  const scrim = usePrimitiveColor('text-foreground/32');

  return useMemo(
    () => ({ disabledContent, disabledContainer, scrim }),
    [disabledContent, disabledContainer, scrim],
  );
}

function tokenColors(
  values: (string | number | undefined)[],
): Partial<Record<TokenRole, string>> {
  const colors: Partial<Record<TokenRole, string>> = {};

  for (const [index, [role]] of colorTokens.entries()) {
    const value = values[index];

    if (typeof value === 'string') colors[role] = value;
  }

  return colors;
}
