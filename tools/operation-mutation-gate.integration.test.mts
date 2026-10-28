import { execFile } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { expect, it, onTestFinished } from 'vitest';

const execute = promisify(execFile);

it('fails the executable gate for a new mutation fixture', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'argo-operation-gate-'));
  const fixture = join(directory, 'router.ts');

  onTestFinished(() => rm(directory, { recursive: true, force: true }));
  await writeFile(
    fixture,
    'const routes = router({ erase: publicProcedure.mutation(() => erase()) });',
  );

  await expect(
    execute(
      process.execPath,
      ['tools/check-operation-mutations.mts', fixture],
      { cwd: new URL('..', import.meta.url), timeout: 10_000 },
    ),
  ).rejects.toMatchObject({
    code: 1,
    stderr: expect.stringContaining(
      'Add an Operation instead of the hand-written mutation erase.',
    ),
  });
});
