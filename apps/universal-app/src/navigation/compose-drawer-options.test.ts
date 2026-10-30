import { describe, expect, it } from 'vitest';
import { composeDrawerOptions } from './compose-drawer-options';

describe('composeDrawerOptions', () => {
  it.each(['compact', 'medium', 'wide'] as const)(
    'names the scrim on a %s window in Argo’s words, beside "Open navigation"',
    (sizeClass) => {
      const options = composeDrawerOptions(sizeClass, {
        narrow: {},
        framed: {},
      });

      expect(options.overlayAccessibilityLabel).toBe('Close navigation');
    },
  );
});
