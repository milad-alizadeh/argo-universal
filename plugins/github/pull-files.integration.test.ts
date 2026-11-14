import { expect, it } from 'vitest';
import { sha } from './github-fixture';
import { attach } from './journey-calls';
import { diffOfPull, fileOf, filesOfPull, setFiles } from './journey-files';
import { journey } from './journey-fixture';

const slow = 30_000;

const reference = 'owner/repository#12';

const forkReference = 'fork-owner/repository#12';

const changed = 'src/a.ts';

const added = 'src/new.ts';

const modified = { operation: 'modify', additions: 1, deletions: 1 };

it(
  "reads the files of the attached pull request against its own repository, base and head, with the pull request's totals",
  async () => {
    const run = await journey();

    setFiles(run.github, reference, [
      fileOf(changed),
      fileOf('src/new.ts', { status: 'added', deletions: 0 }),
      fileOf('src/gone.ts', { status: 'removed', additions: 0 }),
      fileOf('src/moved.ts', {
        status: 'renamed',
        previous_filename: 'src/was.ts',
      }),
    ]);
    await attach(run, reference);

    expect(await filesOfPull(run, { reference })).toEqual({
      mainBranch: null,
      summary: { files: 3, additions: 10, deletions: 2 },
      comparison: { repository: 'owner/repository', base: 'main', head: sha },
      files: [
        { ...modified, path: changed },
        { operation: 'add', path: added, additions: 1, deletions: 0 },
        {
          operation: 'delete',
          path: 'src/gone.ts',
          additions: 0,
          deletions: 1,
        },
        {
          ...modified,
          operation: 'move',
          path: 'src/moved.ts',
          oldPath: 'src/was.ts',
        },
      ],
      nextCursor: null,
    });
  },
  slow,
);

it(
  "reads one file's patch with a header, as the file it belongs to",
  async () => {
    const run = await journey();

    setFiles(run.github, reference, [
      fileOf(changed),
      fileOf('src/new.ts', { status: 'added', patch: '@@ -0,0 +1 @@\n+hello' }),
    ]);
    await attach(run, reference);

    expect(await diffOfPull(run, { reference, path: changed })).toEqual({
      file: { ...modified, path: changed },
      patch: {
        format: 'git_patch',
        text: 'diff --git a/src/a.ts b/src/a.ts\n--- a/src/a.ts\n+++ b/src/a.ts\n@@ -1 +1 @@\n-old src/a.ts\n+new src/a.ts\n',
      },
      nextCursor: null,
    });
    expect(await diffOfPull(run, { reference, path: added })).toMatchObject({
      patch: {
        text: 'diff --git a/src/new.ts b/src/new.ts\n--- /dev/null\n+++ b/src/new.ts\n@@ -0,0 +1 @@\n+hello\n',
      },
    });
  },
  slow,
);

it(
  'gives each pull request its own files, even when two repositories share a number',
  async () => {
    const run = await journey();

    setFiles(run.github, reference, [fileOf('owned.ts')]);
    setFiles(run.github, forkReference, [fileOf('forked.ts')]);
    await attach(run, reference);
    await attach(run, forkReference);

    expect(await filesOfPull(run, { reference })).toMatchObject({
      files: [{ path: 'owned.ts' }],
    });
    expect(await filesOfPull(run, { reference: forkReference })).toMatchObject({
      comparison: { repository: 'fork-owner/repository' },
      files: [{ path: 'forked.ts' }],
    });
    expect(
      await diffOfPull(run, { reference: forkReference, path: 'forked.ts' }),
    ).toMatchObject({ file: { path: 'forked.ts' } });
  },
  slow,
);
