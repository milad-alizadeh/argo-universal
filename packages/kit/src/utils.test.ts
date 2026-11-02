import { expect, it } from 'vitest';
import { cn } from './utils';

// Text starts every line from the default role, whose wide step would otherwise outrank a role that has none.
it.each(['type-title', 'type-title-code', 'type-secondary-code'])(
  '%s replaces the default role',
  (role) => {
    expect(cn('type-body', role)).toBe(role);
  },
);
