import { useCSSVariable } from 'uniwind';
import type { RunTerminalColors } from './run-terminal-props';

const tokens = [
  '--color-card',
  '--color-foreground',
  '--color-primary',
  '--color-muted',
  '--radius-control',
];

export function useRunTerminalColors(): RunTerminalColors {
  const [background, foreground, buttonForeground, keyBackground, radius] =
    useCSSVariable(tokens);

  return {
    background: String(background),
    foreground: String(foreground),
    buttonForeground: String(buttonForeground),
    keyBackground: String(keyBackground),
    radius: String(radius),
  };
}
