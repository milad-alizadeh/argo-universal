import { accessSync, constants } from 'node:fs';
import path from 'node:path';

// The user's own CLI from PATH, the one they signed in to, or null when it is not installed.
export function findExecutable(
  name: string,
  environment: NodeJS.ProcessEnv,
): string | null {
  for (const directory of (environment.PATH ?? '').split(path.delimiter)) {
    const candidate = path.join(directory, name);
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {}
  }
  return null;
}
