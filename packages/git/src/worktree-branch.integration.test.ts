import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import { gitIn, type TestGit } from './test-git.test.mocks';
import { remoteFeatureRef, repository } from './test-repository.test.mocks';
import { CheckoutBaseMissing, resolveCheckoutBase } from './worktree-branch';

const localFeature = 'refs/heads/feature';

const originHead = 'refs/remotes/origin/HEAD';

// Origin tracks `feature`, as a fetch would leave it.
const trackFeatureOnOrigin = (git: TestGit): Promise<string> =>
  git('update-ref', remoteFeatureRef, localFeature);

it('starts from the local base branch when origin has none', async () => {
  const { directory } = await repository();

  expect(await resolveCheckoutBase(directory, 'feature')).toBe(localFeature);
});

it('prefers the base branch on origin', async () => {
  const { directory, git } = await repository();

  await trackFeatureOnOrigin(git);

  expect(await resolveCheckoutBase(directory, 'feature')).toBe(
    remoteFeatureRef,
  );
});

it('starts from the origin default branch when the base branch was deleted or renamed', async () => {
  const { directory, git } = await repository();

  await trackFeatureOnOrigin(git);
  await git('symbolic-ref', originHead, remoteFeatureRef);

  expect(await resolveCheckoutBase(directory, 'dev')).toBe(remoteFeatureRef);
});

it('starts from the main checkout when the base branch is gone and origin names no default', async () => {
  const { directory } = await repository();

  expect(await resolveCheckoutBase(directory, 'dev')).toBe('HEAD');
});

it('skips an origin default that points at a pruned branch', async () => {
  const { directory, git } = await repository();

  await trackFeatureOnOrigin(git);
  await git('symbolic-ref', originHead, remoteFeatureRef);
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
