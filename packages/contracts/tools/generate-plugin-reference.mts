import { readdir, readFile, mkdir, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  documentedComponentNames,
  renderIndex,
  renderComponent,
} from './plugin-reference-pages';

const outputDirectory = resolve(
  import.meta.dirname,
  '../../../docs/plugins/kit-components',
);

const checking = process.argv.includes('--check');

const componentPages = (): (readonly [string, string])[] =>
  documentedComponentNames.map(
    (name) =>
      [resolve(outputDirectory, `${name}.md`), renderComponent(name)] as const,
  );

function generatedFiles(): Map<string, string> {
  return new Map([
    ...componentPages(),
    [
      resolve(outputDirectory, 'index.md'),
      renderIndex(documentedComponentNames),
    ],
  ]);
}

async function existingFiles(): Promise<string[]> {
  const files = await readdir(outputDirectory).catch(() => []);

  return files
    .filter((file) => file.endsWith('.md'))
    .map((file) => resolve(outputDirectory, file));
}

async function outdatedFiles(expected: Map<string, string>): Promise<string[]> {
  const paths = new Set([...expected.keys(), ...(await existingFiles())]);
  const outdated = [];

  for (const path of paths) {
    const actual = await readFile(path, 'utf8').catch(() => null);

    if (actual !== expected.get(path)) outdated.push(path);
  }

  return outdated;
}

async function checkFiles(expected: Map<string, string>): Promise<void> {
  const outdated = await outdatedFiles(expected);

  if (!outdated.length) return;

  console.error('Plugin reference docs are missing or stale:');

  for (const path of outdated) console.error(`  ${path}`);
  console.error(
    'Run `pnpm --filter @repo/contracts generate:plugin-reference`.',
  );
  process.exitCode = 1;
}

async function removeStaleFiles(expectedPaths: Set<string>): Promise<void> {
  for (const path of await existingFiles()) {
    if (!expectedPaths.has(path)) await unlink(path);
  }
}

async function writeExpectedFiles(
  expected: Map<string, string>,
): Promise<void> {
  for (const [path, content] of expected)
    await writeFile(path, content, 'utf8');
}

async function writeFiles(expected: Map<string, string>): Promise<void> {
  await mkdir(outputDirectory, { recursive: true });
  await removeStaleFiles(new Set(expected.keys()));
  await writeExpectedFiles(expected);
}

const files = generatedFiles();

await (checking ? checkFiles(files) : writeFiles(files));
