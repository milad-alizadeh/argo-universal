import { readdirSync } from 'node:fs';
import { expect, test } from 'vitest';
import {
  componentNames,
  componentPaths,
  drawnOutline,
  outlineOf,
} from '../../tools/svg-drawings/outline.mts';

const names = await componentNames();

test.each(names)(
  '%s has a drawing that fills the outline its component strokes',
  async (name) => {
    expect(await drawnOutline(name)).toBe(
      await outlineOf(await componentPaths(name)),
    );
  },
);

test('every drawing but file-diff belongs to an SVG icon', () => {
  const drawings = readdirSync(
    new URL('assets/svg-drawings/', import.meta.url),
  ).map((file) => file.replace(/\.xml$/u, ''));

  expect(drawings.toSorted()).toEqual(
    names.filter((name) => name !== 'file-diff'),
  );
});
