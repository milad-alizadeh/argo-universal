import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { expect, it, onTestFinished, vi } from 'vitest';
import { repository } from '../test-repository.test.mocks';
import { readFileDiff, type FileDiff } from '.';

const paths = ['a.txt', 'b.txt', 'c.txt', 'd.txt'];

type Spawns = { list: () => string[]; clear: () => void };

// A real `git` first on the PATH that writes down each process the code under test starts, then runs it.
function spawnLog(): Spawns {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'argo-git-log-')));
  const log = join(directory, 'spawns.log');
  const shim = join(directory, 'git');
  const path = process.env['PATH'] ?? '';

  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
  writeFileSync(
    shim,
    `#!/bin/sh\necho "$*" >> "${log}"\nPATH="${path}" exec git "$@"\n`,
  );
  chmodSync(shim, 0o755);
  vi.stubEnv('PATH', `${directory}${delimiter}${path}`);
  onTestFinished(() => {
    vi.unstubAllEnvs();
  });

  return {
    list: () =>
      existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n') : [],
    clear: () => {
      rmSync(log, { force: true });
    },
  };
}

async function changedCheckout(): Promise<string> {
  const { directory, git } = await repository(false);

  for (const path of paths) writeFileSync(join(directory, path), 'old\n');

  await git('add', '.');
  await git('commit', '-qm', 'Files');

  for (const path of paths) writeFileSync(join(directory, path), 'new\n');

  return directory;
}

const readAt = (checkout: string, path: string): Promise<FileDiff | null> =>
  readFileDiff({
    checkout,
    projectCheckout: checkout,
    comparison: 'uncommitted',
    path,
  });

it('reads what a comparison shares once for files asked for together', async () => {
  const spawns = spawnLog();
  const checkout = await changedCheckout();

  spawns.clear();

  const diffs = await Promise.all(paths.map((path) => readAt(checkout, path)));
  const started = spawns.list();

  expect(diffs.map((diff) => diff?.file)).toMatchObject(
    paths.map((path) => ({ path, additions: 1, deletions: 1 })),
  );
  expect(started.filter((args) => args.includes(' status '))).toHaveLength(1);
  expect(started.filter((args) => args.includes('--name-status'))).toHaveLength(
    1,
  );
  expect(started.filter((args) => args.includes('--numstat'))).toHaveLength(1);
  // The Project's branch and those three are shared; what is left is one patch per file.
  expect(started).toHaveLength(paths.length + 4);
});

it('sees a change made after an earlier read of the same comparison', async () => {
  const checkout = await changedCheckout();
  const before = await readAt(checkout, 'a.txt');

  writeFileSync(join(checkout, 'a.txt'), 'newer\n');

  const after = await readAt(checkout, 'a.txt');

  expect(before?.patch).toContain('+new');
  expect(after?.patch).toContain('+newer');
});

it('never joins a read that started before it was asked for', async () => {
  const spawns = spawnLog();
  const checkout = await changedCheckout();

  spawns.clear();

  const running = readAt(checkout, 'a.txt');

  await vi.waitFor(() => {
    expect(spawns.list().length).toBeGreaterThan(0);
  });
  writeFileSync(join(checkout, 'e.txt'), 'added\n');

  const [, added] = await Promise.all([running, readAt(checkout, 'e.txt')]);

  expect(added?.file).toMatchObject({ path: 'e.txt', operation: 'add' });
});
