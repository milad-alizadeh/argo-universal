import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { onTestFinished } from 'vitest';

const run = promisify(execFile);

// The test's own git must not inherit the repository a hook or a script runs it from.
const cleanEnvironment = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')),
);

const identity = [
  ['user.name', 'Atlas Test'],
  ['user.email', 'atlas@example.test'],
  ['commit.gpgsign', 'false'],
  ['core.hooksPath', '/dev/null'],
].flatMap(([key, value]) => ['-c', `${key}=${value}`]);

// Real git in a folder, with a fixed author, no signing and no hooks.
export async function git(folder: string, ...args: string[]): Promise<void> {
  await run('git', [...identity, ...args], {
    cwd: folder,
    env: cleanEnvironment,
  });
}

export async function temporaryFolder(): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), 'atlas-'));
  onTestFinished(() => rm(folder, { recursive: true, force: true }));

  return folder;
}

type Files = Record<string, string>;

async function write(folder: string, files: Files): Promise<void> {
  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(folder, path)), { recursive: true });
    await writeFile(join(folder, path), text);
  }
}

// Writes the files and commits them all.
export async function commit(
  folder: string,
  files: Files,
  message: string,
): Promise<void> {
  await write(folder, files);
  await git(folder, 'add', '--all');
  await git(folder, 'commit', '--quiet', '-m', message);
}

export async function emptyRepository(): Promise<string> {
  const folder = await temporaryFolder();
  await git(folder, 'init', '--quiet');

  return folder;
}

export const app = 'src/app.ts';

// Seven lines, three of them branching: `if`, `for` and `??`.
export const appSource = `export function run(x: number): number {
  if (x > 1) {
    return 1;
  }
  for (const item of [x]) item;
  return x ?? 0;
}
`;

// A repository whose app changes in a second commit, so the app ends with eight lines and two changes.
export async function repository(): Promise<string> {
  const folder = await emptyRepository();

  await commit(
    folder,
    {
      'README.md': '# Fixture\n',
      [app]: appSource,
      'src/lib/parse.ts': 'export const parse = (text: string) => text;\n',
    },
    'Add the files',
  );

  await commit(folder, { [app]: `${appSource}// done\n` }, 'Finish the app');

  return folder;
}

const padded = (value: number, width: number): string =>
  String(value).padStart(width, '0');

const layoutOfPaths = {
  features: 40,
  sections: 25,
  idWidth: 4,
  sectionWidth: 2,
};

// Long paths, so each rectangle takes the most bytes it can.
const longPath = (index: number): string =>
  [
    `packages/feature-${padded(index % layoutOfPaths.features, layoutOfPaths.sectionWidth)}/src/components`,
    `a-rather-long-section-name-${padded(index % layoutOfPaths.sections, layoutOfPaths.sectionWidth)}`,
    `another-long-folder-name/with-depth/module-${padded(index, layoutOfPaths.idWidth)}.tsx`,
  ].join('/');

const bigProject = { files: 3000, longestFile: 400 };

// A Project too big for one page: 3,000 files.
export async function largeRepository(): Promise<string> {
  const folder = await emptyRepository();

  const files = Object.fromEntries(
    Array.from({ length: bigProject.files }, (_, index) => [
      longPath(index),
      'x\n'.repeat((index % bigProject.longestFile) + 1),
    ]),
  );

  await commit(folder, files, 'Add many files');

  return folder;
}
