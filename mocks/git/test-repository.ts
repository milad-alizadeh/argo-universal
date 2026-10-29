import { gitIn } from '@repo/git/test-git';

export { initTestRepository } from '@repo/git/test-git';

const lines = (output: string): string[] => output.split('\n').filter(Boolean);

// The Session branches and worktrees a test repository holds, to see what a Session left behind.
export async function readSessionCheckouts(
  directory: string,
): Promise<{ branches: string[]; worktrees: number }> {
  const git = gitIn(directory);
  const branchList = ['--list', '--format=%(refname:short)', 'argo/*'];
  const branches = lines(await git('branch', ...branchList));
  const worktrees = lines(await git('worktree', 'list', '--porcelain'));

  return {
    branches,
    worktrees: worktrees.filter((line) => line.startsWith('worktree ')).length,
  };
}
