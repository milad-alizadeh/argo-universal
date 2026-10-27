import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('..', import.meta.url));

const untrackedToo = ['--cached', '--others', '--exclude-standard'];

// The repo's tracked files matching the pathspecs that still exist on disk; a file deleted but not yet committed is left out. `untracked` also lists files git does not track yet, minus the ignored ones.
export function trackedFiles(
  pathspecs: readonly string[],
  options: { untracked?: boolean } = {},
): string[] {
  const scope = options.untracked ? untrackedToo : [];

  return execFileSync('git', ['ls-files', ...scope, '--', ...pathspecs], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\n')
    .filter((file): boolean => file !== '' && existsSync(resolve(root, file)));
}
