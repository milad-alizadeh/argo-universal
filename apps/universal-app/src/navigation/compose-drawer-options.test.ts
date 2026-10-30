import { describe, expect, it } from 'vitest';
import { composeDrawerOptions } from './compose-drawer-options';

const parts = {
  narrow: { drawerStyle: { width: 300 } },
  framed: { drawerStyle: { width: 320 } },
};

describe('composeDrawerOptions', () => {
  it.each(['compact', 'medium', 'wide'] as const)(
    'names the backdrop "Close navigation" on a %s window',
    (sizeClass) => {
      const options = composeDrawerOptions(sizeClass, parts);

      expect(options.overlayAccessibilityLabel).toBe('Close navigation');
    },
  );

  it.each([
    ['compact', 'front', parts.narrow],
    ['medium', 'front', parts.narrow],
    ['wide', 'permanent', parts.framed],
  ] as const)(
    'a %s window draws a %s drawer with its own options',
    (sizeClass, drawerType, own) => {
      const options = composeDrawerOptions(sizeClass, parts);

      expect(options.drawerType).toBe(drawerType);
      expect(options.drawerStyle).toBe(own.drawerStyle);
    },
  );
});
