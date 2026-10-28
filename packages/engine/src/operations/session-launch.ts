import { randomUUID } from 'node:crypto';
import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AcpResourceInput } from '../agents';
import type { SessionTokens } from './session-tokens';

const cliEntry = fileURLToPath(
  new URL('../../../../apps/cli/bin/argo.mjs', import.meta.url),
);

const quote = (argument: string): string =>
  `'${argument.replaceAll("'", "'\\''")}'`;

// The Server's Node can be bundled or absent from the Project login shell's PATH.
const cliLauncher = `#!/bin/sh
exec ${quote(process.execPath)} ${quote(cliEntry)} "$@"
`;

function cliDirectory(home: string): string {
  const directory = join(home, 'cli', 'bin');
  mkdirSync(directory, { recursive: true });
  const temporary = join(directory, `argo.${randomUUID()}`);

  try {
    writeFileSync(temporary, cliLauncher, { mode: 0o755 });
    renameSync(temporary, join(directory, 'argo'));
  } catch (error) {
    rmSync(temporary, { force: true });
    throw error;
  }

  return directory;
}

export const sessionLaunchPolicy =
  (
    home: string,
    tokens: SessionTokens,
  ): NonNullable<AcpResourceInput['sessionAccess']> =>
  (sessionId, projectId) => {
    const directory = cliDirectory(home);
    const grant = tokens.issue(sessionId, projectId);

    return {
      environment: { token: grant.token, home, cliDirectory: directory },
      release: grant.release,
    };
  };
