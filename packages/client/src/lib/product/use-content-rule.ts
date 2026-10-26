import { useCSSVariable } from 'uniwind';
import type { ContentRule } from './content-rule';

const useTokenPixels = (name: string): number =>
  Number.parseFloat(String(useCSSVariable(name)));

// The rule's numbers from tooling/uniwind/theme.css, which the tokens own.
export const useContentRule = (): ContentRule => ({
  wideMin: useTokenPixels('--container-content-wide'),
  maximum: useTokenPixels('--container-column'),
  gutter: useTokenPixels('--spacing-6'),
  phoneGutter: useTokenPixels('--spacing-4'),
});
