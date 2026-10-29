import {
  existsSync,
  type FSWatcher,
  mkdtempSync,
  realpathSync,
  rmSync,
  watch,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import { createCheckout } from './index';
import { initTestRepository } from './test-repository.test.mocks';

interface CheckoutResources {
  creation?: ReturnType<typeof createCheckout>;
  hookWatcher?: FSWatcher;
}

it('aborts a blocked Checkout and removes its worktree and new branch', async (): Promise<void> => {
  const directory = realpathSync(
    mkdtempSync(join(tmpdir(), 'checkout-abort-')),
  );

  const controller = new AbortController();

  const checkoutResources: CheckoutResources = {};

  onTestFinished(async (): Promise<void> => {
    checkoutResources.hookWatcher?.close();
    controller.abort();
    await Promise.allSettled([checkoutResources.creation]);
    rmSync(directory, { recursive: true, force: true });
  });
  const git = await initTestRepository(directory);

  const checkoutPath = join(
    directory,
    'runtime',
    'worktrees',
    'project',
    'blocked',
  );

  const marker = join(directory, 'hook-started');
  const started = Promise.withResolvers<void>();
  checkoutResources.hookWatcher = watch(directory, (): void => {
    if (existsSync(marker)) started.resolve();
  });
  checkoutResources.hookWatcher.on('error', started.reject);
  writeFileSync(
    join(directory, '.git', 'hooks', 'post-checkout'),
    [
      '#!/bin/sh',
      `echo partial > '${checkoutPath}/half-created'`,
      `echo started > '${marker}'`,
      `while [ -d '${checkoutPath}' ]; do /bin/sleep 0.01; done`,
      '',
    ].join('\n'),
    { mode: 0o755 },
  );

  const creation = createCheckout(
    {
      projectPath: directory,
      projectId: 'project',
      sessionId: 'blocked',
      choice: { type: 'worktree', baseBranch: 'main' },
      runtimeDirectory: join(directory, 'runtime'),
    },
    controller.signal,
  );

  checkoutResources.creation = creation;
  void creation.catch(started.reject);
  await started.promise;
  expect(existsSync(checkoutPath)).toBe(true);
  controller.abort();
  await expect(creation).rejects.toMatchObject({ name: 'AbortError' });
  expect(existsSync(checkoutPath)).toBe(false);
  expect((await git('branch', '--list', 'argo/blocked')).trim()).toBe('');
  expect(await git('worktree', 'list')).not.toContain(checkoutPath);
});
