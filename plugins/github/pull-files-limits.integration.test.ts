import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { expect, it, onTestFinished } from 'vitest';
import { attach } from './journey-calls-fixture';
import {
  diffOfPull,
  fileOf,
  filesOfPull,
  setFiles,
} from './journey-files-fixture';
import {
  foreignSessionId,
  journey,
  otherProject,
  project,
  secondSessionId,
} from './journey-fixture';

const slow = 30_000;

const reference = 'owner/repository#12';

const notAttached = 'is not attached to this Session';

const unavailable = 'GitHub answered 502';

const inCheckout = promisify(execFile);

it(
  'refuses files of a pull request that is not attached to the Session, of another Session, and of another Project',
  async () => {
    const run = await journey();

    setFiles(run.github, reference, [fileOf('secret.ts')]);
    await attach(run, reference);

    const as = { sessionId: secondSessionId, projectId: project.id };

    const foreign = {
      sessionId: foreignSessionId,
      projectId: otherProject.id,
    };

    await expect(
      filesOfPull(run, { reference: 'fork-owner/repository#12' }),
    ).rejects.toThrow(notAttached);
    await expect(filesOfPull(run, { reference, as })).rejects.toThrow(
      notAttached,
    );
    await expect(
      diffOfPull(run, { reference, path: 'secret.ts', as: foreign }),
    ).rejects.toThrow(Error);
  },
  slow,
);

it(
  'says why the files are unavailable, keeps the pull request attached, and reads them once GitHub answers again',
  async () => {
    const run = await journey();

    setFiles(run.github, reference, [fileOf('a.ts')]);
    await attach(run, reference);
    run.github.failWith.status = 502;

    await expect(filesOfPull(run, { reference })).rejects.toThrow(unavailable);
    await expect(diffOfPull(run, { reference, path: 'a.ts' })).rejects.toThrow(
      unavailable,
    );

    run.github.failWith.status = null;

    expect(await filesOfPull(run, { reference })).toMatchObject({
      files: [{ path: 'a.ts' }],
    });
  },
  slow,
);

it(
  'says the file is not among the pull request, rather than showing another',
  async () => {
    const run = await journey();

    setFiles(run.github, reference, [fileOf('a.ts')]);
    await attach(run, reference);

    await expect(
      diffOfPull(run, { reference, path: 'other.ts' }),
    ).rejects.toThrow('is not among the files');
  },
  slow,
);

it(
  'asks to sign in when GitHub no longer accepts the Account',
  async () => {
    const run = await journey();

    setFiles(run.github, reference, [fileOf('a.ts')]);
    await attach(run, reference);
    run.github.accepted.clear();

    await expect(filesOfPull(run, { reference })).rejects.toThrow(
      'Sign in to GitHub',
    );
  },
  slow,
);

it(
  'only reads GitHub, and leaves a Checkout with local work as it was',
  async () => {
    const run = await journey();
    const checkout = await mkdtemp(join(tmpdir(), 'argo-checkout-'));

    onTestFinished(() => rm(checkout, { recursive: true, force: true }));
    await inCheckout('git', ['init', '-b', 'local-branch'], { cwd: checkout });
    await writeFile(join(checkout, 'local-only.ts'), 'local work\n');

    const status = async (): Promise<string> =>
      (
        await inCheckout('git', ['status', '--porcelain=v1', '--branch'], {
          cwd: checkout,
        })
      ).stdout;

    const before = await status();

    setFiles(run.github, reference, [fileOf('remote.ts')]);
    await attach(run, reference);

    const files = await filesOfPull(run, { reference });

    await diffOfPull(run, { reference, path: 'remote.ts' });

    expect(JSON.stringify(files)).not.toContain('local-only.ts');
    expect(await status()).toBe(before);
    expect(
      run.github.requests
        .filter(({ host }) => host === 'api.github.com')
        .every(({ method }) => method === 'GET'),
    ).toBe(true);
  },
  slow,
);
