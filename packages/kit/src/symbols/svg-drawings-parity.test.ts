import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const here = import.meta.dirname;
const componentsDirectory = join(here, 'svg-symbols');
const drawingsDirectory = join(here, 'assets', 'svg-drawings');

const read = (path: string): string => readFileSync(path, 'utf8');

const componentPaths = (name: string): string =>
  [
    ...read(join(componentsDirectory, `${name}.tsx`)).matchAll(
      /<Path d="([^"]+)"/gu,
    ),
  ]
    .map((match) => match[1])
    .join(' ');

const drawnPaths = (file: string): string | undefined =>
  /android:pathData="([^"]+)"/u.exec(read(join(drawingsDirectory, file)))?.[1];

const drawings = readdirSync(drawingsDirectory).filter((file) =>
  file.endsWith('.xml'),
);

test.each(drawings)('%s draws the paths of its SVG component', (file) => {
  expect(drawnPaths(file)).toBe(componentPaths(file.replace(/\.xml$/u, '')));
});

test('every SVG component but file-diff has a drawing here', () => {
  const components = readdirSync(componentsDirectory)
    .filter((file) => file.endsWith('.tsx') && !file.startsWith('svg-symbol-'))
    .map((file) => file.replace(/\.tsx$/u, ''));

  expect(drawings.map((file) => file.replace(/\.xml$/u, ''))).toEqual(
    components.filter((name) => name !== 'file-diff'),
  );
});
