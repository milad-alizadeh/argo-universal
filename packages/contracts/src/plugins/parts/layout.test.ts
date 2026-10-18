import { describe, expect, it } from 'vitest';
import { pluginPartSchemas } from '../plugin-part-schemas';

const grid = pluginPartSchemas.Grid.props;

const surface = pluginPartSchemas.Surface.props;

describe('layout prop boundary', () => {
  it.each([0, -1, 1.5, { compact: 1, wide: 0 }, { compact: 1 }])(
    'refuses invalid Grid columns %j',
    (columns) => {
      expect(grid.safeParse({ columns }).success).toBe(false);
    },
  );

  it.each([7, -1, 1.5])('refuses a non-token gap or padding %j', (spacing) => {
    expect(grid.safeParse({ columns: 2, gap: spacing }).success).toBe(false);
    expect(surface.safeParse({ kind: 'card', padding: spacing }).success).toBe(
      false,
    );
  });

  it('accepts per-Size-class columns and token spacing', () => {
    expect(
      grid.safeParse({ columns: { compact: 1, medium: 2, wide: 4 }, gap: 3 })
        .success,
    ).toBe(true);
  });
});
