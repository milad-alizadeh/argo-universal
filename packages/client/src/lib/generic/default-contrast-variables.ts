import type { ThemeMode } from '@repo/uniwind/themes';
import { Uniwind } from 'uniwind';

const contrastProperties = [
  '--color-muted-foreground',
  '--color-destructive',
  '--color-warning',
] as const;
const defaults = new Map<ThemeMode, Record<string, string | number>>();

function readVariable(name: string): string | number {
  const value = Uniwind.getCSSVariable(name);
  if (typeof value === 'string' || typeof value === 'number') return value;
  throw new Error(`Missing theme variable: ${name}`);
}

export function getDefaultContrastVariables(
  mode: ThemeMode,
): Record<string, string | number> {
  const cached = defaults.get(mode);
  if (cached) return cached;
  Uniwind.setTheme(mode);
  const variables = Object.fromEntries(
    contrastProperties.map((name) => [name, readVariable(name)]),
  );
  defaults.set(mode, variables);
  return variables;
}
