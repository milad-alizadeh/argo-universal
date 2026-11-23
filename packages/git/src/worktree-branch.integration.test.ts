import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import { gitIn } from './test-git.test.mocks';
import { remoteFeatureRef, repository } from './test-repository.test.mocks';
import { CheckoutBaseMissing, resolveCheckoutBase } from './worktree-branch';

it('prefers the base branch on origin, then the local one', async () => {
  const { directory, git } = await repository();

  expect(await resolveCheckoutBase(directory, 'feature')).toBe(
    'refs/heads/feature',
  );
  await git('update-ref', remoteFeatureRef, 'refs/heads/feature');
  expect(await resolveCheckoutBase(directory, 'feature')).toBe(
    remoteFeatureRef,
  );
});

it('starts from the origin default branch when the base branch was deleted or renamed', async () => {
  const { directory, git } = await repository();

  await git('update-ref', remoteFeatureRef, 'refs/heads/feature');
  await git('symbolic-ref', 'refs/remotes/origin/HEAD', remoteFeatureRef);

  expect(await resolveCheckoutBase(directory, 'dev')).toBe(remoteFeatureRef);
});

it('starts from the main checkout when the base branch is gone and origin names no default', async () => {
  const { directory } = await repository();

  expect(await resolveCheckoutBase(directory, 'dev')).toBe('HEAD');
});

it('skips an origin default that points at a pruned branch', async () => {
  const { directory, git } = await repository();

  await git('update-ref', remoteFeatureRef, 'refs/heads/feature');
  await git('symbolic-ref', 'refs/remotes/origin/HEAD', remoteFeatureRef);
  await git('update-ref', '-d', remoteFeatureRef);

  expect(await resolveCheckoutBase(directory, 'dev')).toBe('HEAD');
});

it('refuses only when the Project has no commit to start from', async () => {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'argo-empty-')));

  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
  await gitIn(directory)('init', '-q', '--initial-branch=main');

  await expect(resolveCheckoutBase(directory, 'main')).rejects.toBeInstanceOf(
    CheckoutBaseMissing,
  );
});
