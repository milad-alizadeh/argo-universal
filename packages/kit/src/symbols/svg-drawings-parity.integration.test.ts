import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import {
  componentNames,
  componentPaths,
  drawingFile,
  outlineOf,
} from '../../tools/svg-drawings/outline.mts';

const drawnPaths = async (name: string): Promise<string | undefined> =>
  /android:pathData="([^"]+)"/u.exec(
    await readFile(drawingFile(name), 'utf8'),
  )?.[1];

test('every SVG icon has an Android drawing', async () => {
  const names = await componentNames();

  expect(names.length).toBeGreaterThan(0);

  const drawings = await Promise.all(names.map(drawnPaths));

  expect(drawings.map((drawing) => drawing !== undefined)).toEqual(
    names.map(() => true),
  );
});

test('each drawing fills the outline its component strokes', async () => {
  const names = await componentNames();

  const drawn = await Promise.all(names.map(drawnPaths));

  const expected = await Promise.all(
    names.map(async (name) => outlineOf(await componentPaths(name))),
  );

  expect(drawn).toEqual(expected);
});
