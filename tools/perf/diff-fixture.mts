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

/*
 * The first row of the changed file's diff, which no other row in the Inspector carries. Every
 * line changes, so git writes the file's removed lines before its added ones: the first row
 * drawn is the first removed line, and the first added line sits below all the removed ones,
 * out of the reading area for any file longer than the Changes list is tall.
 */
export const firstDiffRowMarker = (size: DiffSize): string =>
  `PERF_DIFF_${size.toUpperCase()}_BASELINE 1`;

const text = (size: DiffSize, word: 'BASELINE' | 'CHANGED'): string =>
  Array.from(
    { length: sizes[size] },
    (_, index) => `PERF_DIFF_${size.toUpperCase()}_${word} ${index + 1}`,
  ).join('\n');

const baselineText = (size: DiffSize): string => text(size, 'BASELINE');

const changedText = (size: DiffSize): string => text(size, 'CHANGED');

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
