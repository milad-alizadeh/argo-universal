import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { commit } from '../test-git.test.mocks';
import { repository } from '../test-repository.test.mocks';
import { hasUncommittedFiles } from '.';

it('finds no uncommitted file in a clean Checkout or one that is gone', async () => {
  const { directory } = await repository();

  expect(await hasUncommittedFiles(directory)).toBe(false);
  expect(await hasUncommittedFiles(join(directory, 'gone'))).toBe(false);
});

it('finds an untracked file, a staged file and a modified tracked file', async () => {
  const { directory, git } = await repository();
  const file = join(directory, 'tracked.txt');

  writeFileSync(file, 'one\n');
  expect(await hasUncommittedFiles(directory)).toBe(true);

  await git('add', 'tracked.txt');
  expect(await hasUncommittedFiles(directory)).toBe(true);

  await commit(git, 'Track');
  expect(await hasUncommittedFiles(directory)).toBe(false);

  writeFileSync(file, 'two\n');
  expect(await hasUncommittedFiles(directory)).toBe(true);
});

it('does not count an ignored file', async () => {
  const { directory, git } = await repository();

  writeFileSync(join(directory, '.gitignore'), 'ignored.txt\n');
  await git('add', '.gitignore');
  await commit(git, 'Ignore');
  writeFileSync(join(directory, 'ignored.txt'), 'x\n');

  expect(await hasUncommittedFiles(directory)).toBe(false);
});
