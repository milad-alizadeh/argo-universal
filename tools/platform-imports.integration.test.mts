import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

const repoRoot = join(import.meta.dirname, '..');

// Metro picks a platform's drawing by filename, so a fixed-extension alias must never name one.
const packages = ['packages/client', 'packages/kit'];

const folderIn = (packageRoot: string, directory: string): string =>
  join(repoRoot, packageRoot, directory);

const platformSuffix = /\.(?:ios|android|web|native)\.tsx?$/;

interface AliasFolder {
  prefix: string;
  folder: string;
}

function fixedAliasFolder(alias: string, target: string): AliasFolder[] {
  if (!/\.tsx?$/.test(target)) return [];

  return [
    {
      prefix: alias.slice(0, alias.indexOf('*')),
      folder: target.slice(0, target.indexOf('*')).replace(/^\.\//, ''),
    },
  ];
}

type Target = string | { default?: string };

function targetPath(target: Target): string {
  return typeof target === 'string' ? target : (target.default ?? '');
}

function aliasFolders(packageRoot: string): AliasFolder[] {
  const manifest: { imports?: Record<string, Target> } = JSON.parse(
    readFileSync(folderIn(packageRoot, 'package.json'), 'utf8'),
  );

  return Object.entries(manifest.imports ?? {}).flatMap(([alias, target]) =>
    fixedAliasFolder(alias, targetPath(target)),
  );
}

function listFiles(packageRoot: string, directory: string): string[] {
  return readdirSync(folderIn(packageRoot, directory), { recursive: true })
    .map((name) => join(directory, String(name)))
    .filter((name) => /\.tsx?$/.test(name));
}

function forbiddenSpecifiers(
  packageRoot: string,
  folders: AliasFolder[],
): Set<string> {
  const platformFiles = listFiles(packageRoot, 'src').filter((name) =>
    platformSuffix.test(name),
  );

  return new Set(
    platformFiles.flatMap((file) =>
      folders.flatMap(({ prefix, folder }) =>
        file.startsWith(folder)
          ? [prefix + file.slice(folder.length).replace(platformSuffix, '')]
          : [],
      ),
    ),
  );
}

function forbiddenImportsIn(
  packageRoot: string,
  file: string,
  forbidden: Set<string>,
): string[] {
  const lines = readFileSync(folderIn(packageRoot, file), 'utf8').split('\n');

  return lines.flatMap((line, index) =>
    [...line.matchAll(/(['"])(#[^'"]+)\1/g)].flatMap((match) => {
      const specifier = match[2] ?? '';

      return forbidden.has(specifier)
        ? [`${packageRoot}/${file}:${index + 1} ${specifier}`]
        : [];
    }),
  );
}

function packageHits(packageRoot: string): string[] {
  const forbidden = forbiddenSpecifiers(packageRoot, aliasFolders(packageRoot));

  expect(
    forbidden.size,
    `${packageRoot} draws for some platform`,
  ).toBeGreaterThan(0);

  return [
    ...listFiles(packageRoot, 'src'),
    ...listFiles(packageRoot, 'mocks'),
  ].flatMap((file) => forbiddenImportsIn(packageRoot, file, forbidden));
}

it('keeps fixed-extension aliases away from platform drawings', () => {
  expect(
    packages.flatMap((packageRoot) => packageHits(packageRoot)),
    'Use relative paths or the extensionless #primitives alias for platform drawings.',
  ).toEqual([]);
});
