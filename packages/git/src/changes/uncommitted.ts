import { existsSync } from 'node:fs';
import { readWorktree } from './status';

// Whether `git status` lists a file: modified, staged or untracked, never an ignored one. A folder that is gone has none.
export async function hasUncommittedFiles(checkout: string): Promise<boolean> {
  return existsSync(checkout) && (await readWorktree(checkout)) !== '';
}
