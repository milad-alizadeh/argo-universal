import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { repository } from '../test-repository.test.mocks';
import { readChangedFiles, readChangesSummary } from '.';

async function threeUntrackedFiles(): Promise<{ directory: string }> {
  const { directory } = await repository(false);

  for (const name of ['a.txt', 'b.txt', 'c.txt'])
    writeFileSync(join(directory, name), `${name}\n`);

  return { directory };
}

it('pages the changed files and keeps the whole comparison in the summary', async () => {
  const { directory } = await threeUntrackedFiles();
  const selection = { checkout: directory, projectCheckout: directory };

  const first = await readChangedFiles(selection, { limit: 2 });
  const second = await readChangedFiles(selection, { cursor: 2, limit: 2 });

  expect([first, second]).toMatchObject([
    {
      files: [{ path: 'a.txt' }, { path: 'b.txt' }],
      nextCursor: 2,
      summary: { files: 3, additions: 3, deletions: 0 },
    },
    {
      files: [{ path: 'c.txt' }],
      nextCursor: null,
      summary: { files: 3, additions: 3, deletions: 0 },
    },
  ]);
});

it('summarises the main comparison without a page', async () => {
  const { directory } = await threeUntrackedFiles();

  expect(
    await readChangesSummary({
      checkout: directory,
      projectCheckout: directory,
    }),
  ).toEqual({ files: 3, additions: 3, deletions: 0 });
});

it('counts every untracked file when they outnumber one batch of reads', async () => {
  const { directory } = await repository(false);

  const names = Array.from(
    { length: 19 },
    (_, index) => `file-${String(index).padStart(2, '0')}.txt`,
  );

  for (const name of names) writeFileSync(join(directory, name), `${name}\n`);

  const { files, summary } = await readChangedFiles({
    checkout: directory,
    projectCheckout: directory,
  });

  expect(files.map(({ path }) => path)).toEqual(names);
  expect(files.every(({ additions }) => additions === 1)).toBe(true);
  expect(summary).toEqual({ files: 19, additions: 19, deletions: 0 });
});
