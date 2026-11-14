import { expect, it } from 'vitest';
import { headFrom, pullOf } from './github-fixture';
import { attach } from './journey-calls-fixture';
import {
  diffOfPull,
  fileOf,
  filesOfPull,
  setFiles,
} from './journey-files-fixture';
import { journey } from './journey-fixture';

const slow = 30_000;

const reference = 'owner/repository#12';

const lastPath = 'file-119.ts';

it(
  'reads a pull request proposed from a fork in the repository it targets',
  async () => {
    const run = await journey();

    const [key, pull] = pullOf('upstream/repository', 7, {
      head: headFrom('someone', 'feature-7'),
    });

    run.github.pulls.set(key, pull);
    setFiles(run.github, key, [fileOf('upstream.ts')]);
    await attach(run, key);

    expect(await filesOfPull(run, { reference: key })).toMatchObject({
      comparison: { repository: 'upstream/repository', base: 'main' },
      files: [{ path: 'upstream.ts' }],
    });
    expect(run.github.fileReads().map(({ path }) => path)).toEqual([
      '/repos/upstream/repository/pulls/7/files?per_page=50&page=1',
    ]);
  },
  slow,
);

it(
  'pages a long list of files with a cursor, and ends it at the pull request total',
  async () => {
    const run = await journey();
    const total = 120;

    const [key, pull] = pullOf('owner/repository', 12, {
      changed_files: total,
    });

    run.github.pulls.set(key, pull);
    setFiles(
      run.github,
      key,
      Array.from({ length: total }, (_, index) => fileOf(`file-${index}.ts`)),
    );
    await attach(run, reference);

    const answers = [
      await filesOfPull(run, { reference }),
      await filesOfPull(run, { reference, cursor: 2 }),
      await filesOfPull(run, { reference, cursor: 3 }),
    ];

    expect(answers).toMatchObject([
      { nextCursor: 2 },
      { nextCursor: 3 },
      { nextCursor: null },
    ]);
    expect(JSON.stringify(answers[0])).toContain('file-0.ts');
    expect(JSON.stringify(answers[2])).toContain(lastPath);
    expect(await diffOfPull(run, { reference, path: lastPath })).toMatchObject({
      file: { path: lastPath },
    });
  },
  slow,
);
