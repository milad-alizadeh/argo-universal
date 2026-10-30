import { git } from '../git';
import { untrackedFile, type CheckoutFile } from './parse';

const untrackedBatchSize = 8;

// `git diff --no-index` exits 1 when the files differ, with the diff on stdout.
async function diffNoIndex(checkout: string, args: string[]): Promise<string> {
  try {
    return await git(checkout, ['diff', '--no-index', ...args]);
  } catch (error) {
    if (isDiffResult(error)) return String(error.stdout);
    throw error;
  }
}

function isDiffResult(
  error: unknown,
): error is Error & { code: number; stdout: unknown } {
  return error instanceof Error && diffError(error) && 'stdout' in error;
}

function diffError(error: Error): boolean {
  return 'code' in error && error.code === 1;
}

async function untrackedChange(
  checkout: string,
  path: string,
): Promise<CheckoutFile> {
  const stat = await diffNoIndex(checkout, [
    '--numstat',
    '-z',
    '--',
    '/dev/null',
    path,
  ]);

  return untrackedFile(path, stat);
}

// Each untracked file costs one git process, so they run in small batches.
export async function untrackedChanges(
  checkout: string,
  paths: string[],
): Promise<CheckoutFile[]> {
  const files: CheckoutFile[] = [];

  for (let start = 0; start < paths.length; start += untrackedBatchSize)
    files.push(
      ...(await Promise.all(
        paths
          .slice(start, start + untrackedBatchSize)
          .map((path) => untrackedChange(checkout, path)),
      )),
    );

  return files;
}

export async function untrackedDiff(
  checkout: string,
  path: string,
): Promise<{ file: CheckoutFile; patch: string }> {
  const [file, patch] = await Promise.all([
    untrackedChange(checkout, path),
    diffNoIndex(checkout, ['--', '/dev/null', path]),
  ]);

  return { file, patch };
}
