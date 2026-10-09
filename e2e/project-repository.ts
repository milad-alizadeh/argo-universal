import { execFile } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { promisify } from 'node:util';

const run = promisify(execFile);

// A git repository with one commit on main, so an e2e Server's worktrees never land in this repo.
export async function createProjectRepository(
  directory: string,
): Promise<string> {
  await mkdir(directory, { recursive: true });
  const git = (
    ...arguments_: string[]
  ): import('child_process').PromiseWithChild<{
    stdout: string;
    stderr: string;
  }> => run('git', ['-C', directory, ...arguments_]);
  await git('init', '--initial-branch=main');
  await git(
    '-c',
    'user.name=Argo e2e',
    '-c',
    'user.email=e2e@example.com',
    'commit',
    '--allow-empty',
    '--message=Start',
  );
  return directory;
}

// Run before the web project's Server: `node --import tsx project-repository.ts <directory>`.
if (process.argv[1] === import.meta.filename) {
  const directory = process.argv[2];
  if (!directory) throw new Error('Name the directory for the Project');
  await createProjectRepository(directory);
}
