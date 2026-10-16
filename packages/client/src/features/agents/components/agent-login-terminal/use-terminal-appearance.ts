import { useMemo } from 'react';
import { useCSSVariable } from 'uniwind';
import type { TerminalAppearance } from './terminal-appearance';

const tokens = ['--color-muted', '--color-foreground', '--color-primary'];

// The terminal draws in a DOM component, which has no Uniwind, so its host reads the colour tokens and hands them over.
export function useTerminalAppearance(): TerminalAppearance {
  const [background, foreground, buttonForeground] = useCSSVariable(tokens);

  return useMemo(
    () => ({
      background: String(background),
      foreground: String(foreground),
      buttonForeground: String(buttonForeground),
    }),
    [background, foreground, buttonForeground],
  );
}
