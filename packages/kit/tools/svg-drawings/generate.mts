import { readFile, writeFile } from 'node:fs/promises';
import {
  componentNames,
  componentPaths,
  drawingFile,
  drawingXml,
  outlineOf,
} from './outline.mts';

/*
 * Writes the Android drawing of each SVG icon (`svg-symbols`) as filled outlines; `--check` fails when one is
 * out of date instead of writing it.
 */
const check = process.argv.includes('--check');

const stale: string[] = [];

for (const name of await componentNames()) {
  const xml = drawingXml(await outlineOf(await componentPaths(name)));
  const file = drawingFile(name);
  const current = await readFile(file, 'utf8').catch(() => '');

  if (current === xml) continue;

  if (check) stale.push(name);
  else await writeFile(file, xml);
}

if (stale.length > 0)
  throw new Error(
    `Out of date: ${stale.join(', ')}. Run pnpm generate:svg-drawings in packages/kit.`,
  );
