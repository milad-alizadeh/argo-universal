import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

const repoRoot = join(import.meta.dirname, '..');

const readManifest = (
  packageRoot: string,
): { imports: Record<string, Target> } =>
  JSON.parse(readFileSync(join(repoRoot, packageRoot, 'package.json'), 'utf8'));

const clientManifest = readManifest('packages/client');

const kitManifest = readManifest('packages/kit');

type Target = string | { default?: string };

interface Package {
  root: string;
  imports: Record<string, Target>;
}

// Metro picks a platform's drawing by filename, so a fixed-extension alias must never name one.
const packages: readonly Package[] = [
  { root: 'packages/client', imports: clientManifest.imports },
  { root: 'packages/kit', imports: kitManifest.imports },
];

const folderIn = (packageRoot: string, directory: string): string =>
  join(repoRoot, packageRoot, directory);

const platformSuffix = /\.(?:ios|android|web|native)\.tsx?$/;

interface AliasFolder {
  prefix: string;
  folder: string;
}

function targetPath(target: Target): string {
  return typeof target === 'string' ? target : (target.default ?? '');
}

function fixedAliasFolder(alias: string, target: Target): AliasFolder[] {
  const path = targetPath(target);

  if (!/\.tsx?$/.test(path)) return [];

  return [
    {
      prefix: alias.slice(0, alias.indexOf('*')),
      folder: path.slice(0, path.indexOf('*')).replace(/^\.\//, ''),
    },
  ];
}

function aliasFolders({ imports }: Package): AliasFolder[] {
  return Object.entries(imports).flatMap(([alias, target]) =>
    fixedAliasFolder(alias, target),
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

function packageHits(entry: Package, forbidden: Set<string>): string[] {
  return [
    ...listFiles(entry.root, 'src'),
    ...listFiles(entry.root, 'mocks'),
  ].flatMap((file) => forbiddenImportsIn(entry.root, file, forbidden));
}

it('keeps fixed-extension aliases away from platform drawings', () => {
  const forbidden = packages.map((entry): [Package, Set<string>] => [
    entry,
    forbiddenSpecifiers(entry.root, aliasFolders(entry)),
  ]);

  for (const [entry, specifiers] of forbidden) {
    expect(
      specifiers.size,
      `${entry.root} has no platform drawing under a fixed-extension alias, so this test guards nothing there`,
    ).toBeGreaterThan(0);
  }

  expect(
    forbidden.flatMap(([entry, specifiers]) => packageHits(entry, specifiers)),
    'Use relative paths or the extensionless #primitives alias for platform drawings.',
  ).toEqual([]);
});
