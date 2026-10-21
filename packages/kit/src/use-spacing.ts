import { useCSSVariable } from 'uniwind';

// A step of the spacing scale in theme.css, such as `--spacing-4`.
export type SpacingToken = `--spacing-${string}`;

// A spacing token's length in points, for props that take a number. The web reads "16px", native 16.
export function useSpacing(token: SpacingToken): number {
  const value = useCSSVariable(token);

  return typeof value === 'number' ? value : Number.parseFloat(value ?? '');
}
