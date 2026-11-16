import { randomUUID } from 'node:crypto';
import { renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// A file the Server writes beside the CLI launcher for Agent processes to run.
export type LauncherFile = { name: string; content: string; mode: number };

// Single quotes keep a path with spaces or `$` one shell argument.
export const quote = (argument: string): string =>
  `'${argument.replaceAll("'", "'\\''")}'`;

// Each file is written whole and then moved into place, so a Session never starts one half written.
export function replaceFile(directory: string, file: LauncherFile): void {
  const temporary = join(directory, `${file.name}.${randomUUID()}`);

  try {
    writeFileSync(temporary, file.content, { mode: file.mode });
    renameSync(temporary, join(directory, file.name));
  } catch (error) {
    rmSync(temporary, { force: true });
    throw error;
  }
}
