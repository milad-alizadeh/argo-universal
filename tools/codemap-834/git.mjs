import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));

const gitExecutable = '/usr/bin/git';

const maximumOutputBytes = 20971520;

export const historyCommits = 1000;

export function git(args) {
  return execFileSync(gitExecutable, args, {
    cwd: root,
    maxBuffer: maximumOutputBytes,
    encoding: 'utf8',
  });
}

function countFile(commits, name) {
  if (name) commits.set(name, (commits.get(name) ?? 0) + 1);
}

export function activity() {
  const commits = new Map();

  const names = git([
    'log',
    `-${historyCommits}`,
    '--format=',
    '--name-only',
  ]).split('\n');

  for (const name of names) countFile(commits, name);

  return commits;
}
