import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { resolveExecutable } from '@repo/executables';
import { z } from 'zod';

const command = process.argv[2];

if (!command) throw new Error('Pass the package type-check command.');

// Turbo sets TURBO_HASH for a running task. Its dependency graph already prepares declarations.
if (process.env.TURBO_HASH) {
  const result = spawnSync(command, { shell: true, stdio: 'inherit' });

  process.exitCode = result.status ?? 1;
} else {
  const manifest = z
    .object({ name: z.string() })
    .parse(JSON.parse(await readFile(resolve('package.json'), 'utf8')));

  const result = spawnSync(
    resolveExecutable('pnpm'),
    ['exec', 'turbo', 'run', 'check-types', `--filter=${manifest.name}`],
    { cwd: resolve(import.meta.dirname, '..'), stdio: 'inherit' },
  );

  process.exitCode = result.status ?? 1;
}
