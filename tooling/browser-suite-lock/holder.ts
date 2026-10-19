import { readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

// A holder writes its file right after making the directory; a directory without one for this long was left by a crash.
const ORPHAN_MS = 10_000;

const holderSchema = z.object({
  pid: z.number(),
  cwd: z.string(),
  since: z.string(),
});

export type BrowserSuiteHolder = z.infer<typeof holderSchema>;

// Any other answer, such as EPERM for another user's process, means the holder still runs.
const Gone = z.object({ code: z.literal('ESRCH') });

const holderFile = (directory: string): string =>
  path.join(directory, 'holder.json');

export function readHolder(directory: string): BrowserSuiteHolder | undefined {
  try {
    const text = readFileSync(holderFile(directory), 'utf8');

    return holderSchema.parse(JSON.parse(text));
  } catch {
    return undefined;
  }
}

export function writeHolder(directory: string): void {
  const holder: BrowserSuiteHolder = {
    pid: process.pid,
    cwd: process.cwd(),
    since: new Date().toISOString(),
  };

  writeFileSync(holderFile(directory), JSON.stringify(holder));
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);

    return true;
  } catch (error) {
    return !Gone.safeParse(error).success;
  }
}

function isOrphaned(directory: string): boolean {
  try {
    return Date.now() - statSync(directory).mtimeMs > ORPHAN_MS;
  } catch {
    return false;
  }
}

export const isAbandoned = (
  directory: string,
  holder: BrowserSuiteHolder | undefined,
): boolean => (holder ? !isRunning(holder.pid) : isOrphaned(directory));
