import { useMemo } from 'react';
import { useCSSVariable, useUniwind } from 'uniwind';
import { usePrimitiveColor } from './primitives/primitive-color';

const colorTokens = [
  ['tint', '--color-tint'],
  ['background', '--color-background'],
  ['foreground', '--color-foreground'],
  ['muted', '--color-muted'],
  ['mutedForeground', '--color-muted-foreground'],
  ['popover', '--color-popover'],
  ['popoverForeground', '--color-popover-foreground'],
  ['primary', '--color-primary'],
  ['primaryForeground', '--color-primary-foreground'],
  ['border', '--color-border'],
  ['destructive', '--color-destructive'],
] as const;
const tokenNames = colorTokens.map(([, name]) => name);

type TokenRole = (typeof colorTokens)[number][0];
// Material's disabled content (38%) and container (12%) over the foreground.
type DisabledRole = 'disabledContent' | 'disabledContainer';
// A colour is missing only while Uniwind has not resolved its token.
export type NativeColors = Partial<Record<TokenRole | DisabledRole, string>>;

export interface NativeTheme {
  colorScheme: 'light' | 'dark';
  colors: NativeColors;
}

// Argo's tokens for native controls, re-resolved whenever the theme or Appearance changes.
export function useNativeTheme(): NativeTheme {
  const { theme } = useUniwind();
  const tokens = useCSSVariable(tokenNames);
  const disabledContent = usePrimitiveColor('text-foreground/38');
  const disabledContainer = usePrimitiveColor('text-foreground/12');
  const colors = useMemo(
    () => ({ ...tokenColors(tokens), disabledContent, disabledContainer }),
    [tokens, disabledContent, disabledContainer],
  );
  return { colorScheme: theme === 'dark' ? 'dark' : 'light', colors };
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
