import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import clientPackage from '../package.json' with { type: 'json' };

const packageRoot = join(import.meta.dirname, '..');
const platformSuffix = /\.(?:ios|android|web|native)\.tsx?$/;

const aliasFolders = Object.entries(clientPackage.imports).map(
  ([alias, target]) => ({
    prefix: alias.slice(0, alias.indexOf('*')),
    folder: target.slice(0, target.indexOf('*')).replace(/^\.\//, ''),
  }),
);

function listFiles(directory: string): string[] {
  return readdirSync(join(packageRoot, directory), { recursive: true })
    .map((name) => join(directory, String(name)))
    .filter((name) => /\.tsx?$/.test(name));
}

const platformFiles = listFiles('src').filter((name) =>
  platformSuffix.test(name),
);

const forbiddenSpecifiers = new Set(
  platformFiles.flatMap((file) =>
    aliasFolders.flatMap(({ prefix, folder }) =>
      file.startsWith(folder)
        ? [prefix + file.slice(folder.length).replace(platformSuffix, '')]
        : [],
    ),
  ),
);

it('imports each platform file by relative path, so Metro can pick the platform file', () => {
  expect(platformFiles.length).toBeGreaterThan(0);
  expect(forbiddenSpecifiers.size).toBeGreaterThan(0);

  const hits: string[] = [];
  for (const file of [...listFiles('src'), ...listFiles('mocks')]) {
    const lines = readFileSync(join(packageRoot, file), 'utf8').split('\n');
    for (const [index, line] of lines.entries()) {
      for (const match of line.matchAll(/(['"])(#[^'"]+)\1/g)) {
        const specifier = match[2];
        if (specifier && forbiddenSpecifiers.has(specifier)) {
          hits.push(`packages/client/${file}:${index + 1} ${specifier}`);
        }
      }
    }
  }

  expect(
    hits,
    'Import platform files by relative path: an alias resolves to the base file, so iOS and Android ship it.',
  ).toEqual([]);
});
