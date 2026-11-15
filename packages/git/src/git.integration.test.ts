import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { expect, it, onTestFinished } from 'vitest';
import { git } from './git';

function testDirectory(): string {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'git-thread-')));

  onTestFinished((): void => {
    rmSync(directory, { recursive: true, force: true });
  });

  return directory;
}

it('reads git output', async (): Promise<void> => {
  const directory = testDirectory();

  await expect(git(directory, ['init', '--initial-branch=main'])).resolves.toBe(
    `Initialized empty Git repository in ${directory}/.git/\n`,
  );
});

it('starts no process on the calling thread while a git command runs', async (): Promise<void> => {
  const controller = new AbortController();

  // This command waits on its input, so it is still running when the thread's resources are read.
  const reading = git(
    testDirectory(),
    ['hash-object', '--stdin'],
    controller.signal,
  );

  await wait(500);
  const resources = process.getActiveResourcesInfo();

  controller.abort();

  await expect(reading).rejects.toMatchObject({ name: 'AbortError' });
  expect(resources).not.toContain('ProcessWrap');
});

it('rejects with the exit code and output of a git command that fails', async (): Promise<void> => {
  const directory = testDirectory();

  writeFileSync(join(directory, 'new.txt'), 'one\ntwo\n');

  await expect(
    git(directory, [
      'diff',
      '--no-index',
      '--numstat',
      '--',
      '/dev/null',
      'new.txt',
    ]),
  ).rejects.toMatchObject({ code: 1, stdout: '2\t0\t/dev/null => new.txt\n' });
});

it('stops a running git command when its signal is aborted', async (): Promise<void> => {
  const controller = new AbortController();

  const reading = git(
    testDirectory(),
    ['hash-object', '--stdin'],
    controller.signal,
  );

  controller.abort();

  await expect(reading).rejects.toMatchObject({ name: 'AbortError' });
});

it('rejects without running git when its signal is already aborted', async (): Promise<void> => {
  const directory = testDirectory();

  await expect(
    git(directory, ['init'], AbortSignal.abort()),
  ).rejects.toMatchObject({ name: 'AbortError', code: 'ABORT_ERR' });
  await expect(git(directory, ['rev-parse', '--git-dir'])).rejects.toThrow(
    'not a git repository',
  );
});
