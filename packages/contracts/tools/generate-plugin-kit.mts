import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pluginKitDeclarations } from './plugin-kit-declarations';

const output = resolve(
  import.meta.dirname,
  '../../plugin-kit/src/components.gen.d.ts',
);

const expected = pluginKitDeclarations();

const actual = await readFile(output, 'utf8').catch(() => null);

if (process.argv.includes('--check')) {
  if (actual !== expected) {
    console.error(
      'Plugin JSX declarations are missing or stale. Run pnpm generate:plugin-kit.',
    );
    process.exitCode = 1;
  }
} else if (actual !== expected) {
  // Replace atomically so an editor never reads a partially written declaration.
  const temporary = `${output}.${process.pid}.tmp`;
  await writeFile(temporary, expected, 'utf8');
  await rename(temporary, output);
}
