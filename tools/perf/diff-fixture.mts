import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execute = promisify(execFile);

const author = ['-c', 'user.name=Perf', '-c', 'user.email=perf@example.com'];

// A few changed lines, and a diff long enough to take the Inspector several patch pages.
export type DiffSize = 'small' | 'large';

const sizes: Record<DiffSize, number> = { small: 8, large: 2000 };

const diffSizes: readonly DiffSize[] = ['small', 'large'];

export const diffFile = (size: DiffSize): string => `perf-${size}.txt`;

// The text the changed file opens with, which no other row in the Inspector carries.
export const changedMarker = (size: DiffSize): string =>
  `PERF_DIFF_${size.toUpperCase()}_CHANGED 1`;

const baselineText = (size: DiffSize): string =>
  Array.from(
    { length: sizes[size] },
    (_, index) => `PERF_DIFF_${size.toUpperCase()}_BASELINE ${index + 1}`,
  ).join('\n');

const changedText = (size: DiffSize): string =>
  Array.from(
    { length: sizes[size] },
    (_, index) => `PERF_DIFF_${size.toUpperCase()}_CHANGED ${index + 1}`,
  ).join('\n');

export interface DiffCounts {
  size: DiffSize;
  changedLines: number;
  bytes: number;
}

export const diffCounts = (size: DiffSize): DiffCounts => ({
  size,
  changedLines: sizes[size],
  bytes: Buffer.byteLength(changedText(size)),
});

async function git(cwd: string, ...parameters: string[]): Promise<void> {
  await execute('git', [...author, ...parameters], { cwd });
}

const written = new Set<string>();

// Commits both files as `origin/main`, once per Project, the way the e2e changed-files steps do.
async function commitBaseline(projectPath: string): Promise<void> {
  if (written.has(projectPath)) return;
  written.add(projectPath);

  for (const size of diffSizes)
    await writeFile(path.join(projectPath, diffFile(size)), baselineText(size));
  await git(projectPath, 'add', diffFile('small'), diffFile('large'));
  await git(projectPath, 'commit', '-qm', 'Perf diff baseline');
  await git(projectPath, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
}

/*
 * Leaves exactly one of the two files changed in the Project's working tree, so a scenario opens
 * a diff of the size it names and no other. The other file is rewritten to its committed text.
 */
export async function changeOnly(
  projectPath: string,
  size: DiffSize,
): Promise<void> {
  await commitBaseline(projectPath);

  for (const each of diffSizes)
    await writeFile(
      path.join(projectPath, diffFile(each)),
      each === size ? changedText(each) : baselineText(each),
    );
}
