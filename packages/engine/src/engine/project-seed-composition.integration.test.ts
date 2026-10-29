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
  // CI checks out a detached HEAD, which defaults to the main checkout.
  const { currentBranch } = await listBranches(process.cwd());

  const root = execFileSync('/usr/bin/git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
  }).trim();

  expect(projects[0]).toMatchObject({
    name: path.basename(root),
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
