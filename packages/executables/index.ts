import { accessSync, constants, statSync } from 'node:fs';
import path from 'node:path';

function executable(file: string): boolean {
  try {
    accessSync(file, constants.X_OK);

    return statSync(file).isFile();
  } catch {
    return false;
  }
}

function extensions(): string[] {
  if (process.platform !== 'win32') return [''];

  return (process.env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';');
}

// Resolve once before spawn so the process always receives an absolute executable path.
export function resolveExecutable(command: string): string {
  const directories = (process.env.PATH ?? '').split(path.delimiter);

  const candidates = directories.flatMap((directory): string[] =>
    extensions().map((extension): string =>
      path.resolve(directory, `${command}${extension}`),
    ),
  );

  const found = candidates.find(executable);

  if (!found) throw new Error(`Executable not found in PATH: ${command}`);

  return found;
}
