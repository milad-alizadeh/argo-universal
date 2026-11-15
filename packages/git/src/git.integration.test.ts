import { execFile } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, it, onTestFinished } from 'vitest';
import { git } from './git';

const execute = promisify(execFile);

const gitModule = fileURLToPath(new URL('./git.ts', import.meta.url));

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

// A git command that writes the pid of the process that started git, then waits until it is stopped.
const waitingCommand = (marker: string): string[] => [
  '-c',
  `alias.wait=!ps -o ppid= -p $PPID > '${marker}.part' && mv '${marker}.part' '${marker}'; exec sleep 30`,
  'wait',
];

async function started(marker: string): Promise<number> {
  while (!existsSync(marker)) await wait(10);

  return Number(readFileSync(marker, 'utf8'));
}

it('starts git from the git process, never from the calling process', async (): Promise<void> => {
  const directory = testDirectory();
  const marker = join(directory, 'started');
  const controller = new AbortController();
  const reading = git(directory, waitingCommand(marker), controller.signal);
  const startedBy = await started(marker);

  controller.abort();

  await expect(reading).rejects.toMatchObject({ name: 'AbortError' });
  expect(startedBy).toBeGreaterThan(0);
  expect(startedBy).not.toBe(process.pid);
});

it('keeps a process that only waits on git running until git answers', async (): Promise<void> => {
  const directory = testDirectory();
  const script = join(directory, 'only-git.mjs');

  writeFileSync(
    script,
    `import { git } from ${JSON.stringify(gitModule)};
console.log(await git(${JSON.stringify(directory)}, ['--version']));
`,
  );

  // tsx loads the package's TypeScript as the Engine does; it resolves from this package's folder.
  const { stdout } = await execute(
    process.execPath,
    ['--import', 'tsx', script],
    { cwd: import.meta.dirname },
  );

  expect(stdout).toMatch(/^git version /u);
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
  const directory = testDirectory();
  const marker = join(directory, 'started');
  const controller = new AbortController();
  const reading = git(directory, waitingCommand(marker), controller.signal);

  await started(marker);
  controller.abort();

  await expect(reading).rejects.toMatchObject({
    name: 'AbortError',
    code: 'ABORT_ERR',
  });
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
