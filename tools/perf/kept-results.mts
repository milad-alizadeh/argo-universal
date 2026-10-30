import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/*
 * Results a suite has measured, kept on disk the moment each one is measured.
 *
 * Playwright restarts its worker after a failed test, and a worker's module state dies with it.
 * Results held in an array there are lost when a later scenario fails, and the next worker's
 * report then calls scenarios that were measured "never measured". The run id is shared by every
 * worker of one Playwright run, so every worker reads and writes the same place, and a new run
 * starts with nothing.
 */
// PERF_OUT is where results go.
export const outputDirectory = (): string =>
  process.env.PERF_OUT ?? path.join(os.tmpdir(), 'argo-perf');

// Shared by every worker of one Playwright run; the config sets it before any worker starts.
const runId = (): string => process.env.PERF_RUN_ID ?? 'unscoped';

const directoryFor = (suite: string): string =>
  path.join(outputDirectory(), `.kept-${runId()}`, suite);

// A scenario measured again replaces its own earlier result, never another scenario's.
export async function keepResult<Result>(
  suite: string,
  name: string,
  result: Result,
): Promise<void> {
  const directory = directoryFor(suite);
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, `${encodeURIComponent(name)}.json`),
    JSON.stringify(result),
  );
}

// Every result any worker of this run kept, in a stable order.
export async function keptResults<Result extends object>(
  suite: string,
): Promise<Result[]> {
  const directory = directoryFor(suite);
  await mkdir(directory, { recursive: true });
  const files = await readdir(directory);

  return Promise.all(
    files
      .toSorted((a, b) => a.localeCompare(b))
      .map(async (file): Promise<Result> =>
        JSON.parse(await readFile(path.join(directory, file), 'utf8')),
      ),
  );
}
