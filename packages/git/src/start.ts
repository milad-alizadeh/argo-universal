import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { git } from './git';

// `git clone` makes the folder itself, so it runs from the folder the new one goes in.
export async function cloneRepository(
  url: string,
  destination: string,
): Promise<void> {
  const parent = dirname(destination);

  await mkdir(parent, { recursive: true });
  await git(parent, ['clone', '--', url, destination]);
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
