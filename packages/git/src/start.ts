import { execFile } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { promisify } from 'node:util';
import { git } from './git';

const execute = promisify(execFile);

// `git clone` has no `-C`: it makes the folder, so it runs from where the folder will go.
export async function cloneRepository(
  url: string,
  destination: string,
): Promise<void> {
  await execute('git', ['clone', '--', url, destination]);
}

const author = ['-c', 'user.name=Argo', '-c', 'user.email=argo@localhost'];

// A new repository starts with one empty commit, so it has a branch a Session can start from.
export async function initRepository(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true });
  await git(directory, ['init']);
  await git(directory, [
    ...author,
    'commit',
    '--allow-empty',
    '-m',
    'Initial commit',
  ]);
}
