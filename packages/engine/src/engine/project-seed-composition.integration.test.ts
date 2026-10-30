import { execFileSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { listBranches } from '@repo/git';
import { expect, it, onTestFinished, vi } from 'vitest';
import { waitFor } from 'xstate';
import { startEngineTestHost } from '#mocks/engine';
import { scriptedEngineInput } from '#mocks/scripted-engine';

const engineStopEvent = 'engine.stop';

// The main checkout, read straight from git rather than through the reader under test.
function readMainCheckoutOf(directory: string): string {
  const listed = execFileSync(
    '/usr/bin/git',
    ['worktree', 'list', '--porcelain'],
    { cwd: directory, encoding: 'utf8' },
  );

  const [first] = listed.split('\n');

  if (first === undefined || !first.startsWith('worktree '))
    throw new Error(`No main checkout for ${directory}`);

  return realpathSync(first.slice('worktree '.length));
}

it('seeds the Project from ARGO_PROJECT_PATH at Engine startup', async (): Promise<void> => {
  const directory = realpathSync(
    mkdtempSync(path.join(tmpdir(), 'argo-seed-')),
  );

  onTestFinished((): void =>
    rmSync(directory, { recursive: true, force: true }),
  );
  vi.stubEnv('ARGO_PROJECT_PATH', process.cwd());

  const { engine, createCaller } = await startEngineTestHost({
    ...scriptedEngineInput(),
    home: directory,
  });

  const caller = createCaller();
  const projects = await caller.project.list();
  expect(projects).toHaveLength(1);
  const mainCheckout = readMainCheckoutOf(process.cwd());
  // The main checkout carries the Project, so its HEAD decides the default choice, and CI's detached HEAD defaults to the main checkout.
  const { currentBranch } = await listBranches(mainCheckout);

  expect(projects[0]).toMatchObject({
    name: path.basename(mainCheckout),
    checkoutChoice:
      currentBranch === null
        ? { type: 'main' }
        : { type: 'worktree', baseBranch: currentBranch },
  });
  engine.send({ type: engineStopEvent, reason: 'SIGTERM' });
  await waitFor(
    engine,
    (snapshot): snapshot is Extract<typeof snapshot, { status: 'done' }> =>
      snapshot.status === 'done',
  );
});
