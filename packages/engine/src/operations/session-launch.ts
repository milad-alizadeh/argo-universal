import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { productCompatibility } from '@repo/contracts/product-identity';
import type { AcpResourceInput } from '../agents';
import { quote, replaceFile } from './launcher-file';
import { piLauncherFiles } from './pi-launcher';
import type { SessionTokens } from './session-tokens';

// The Server's Node can be bundled or absent from the Project login shell's PATH.
const cliLauncher = (cliEntry: string): string => `#!/bin/sh
exec ${quote(process.execPath)} ${quote(cliEntry)} "$@"
`;

function writeCliLauncher(home: string, cliEntry: string): string {
  const directory = join(home, 'cli', 'bin');
  mkdirSync(directory, { recursive: true });

  for (const file of [
    {
      name: productCompatibility.command,
      content: cliLauncher(cliEntry),
      mode: 0o755,
    },
    ...piLauncherFiles(directory),
  ])
    replaceFile(directory, file);

  return directory;
}

export function sessionLaunchPolicy(
  home: string,
  tokens: SessionTokens,
  cliEntry: string,
): NonNullable<AcpResourceInput['sessionAccess']> {
  const launcher = cliLauncherOnce(home, cliEntry);

  return (sessionId, projectId) => {
    const grant = tokens.issue(sessionId, projectId);

    return {
      environment: { token: grant.token, home, cliDirectory: launcher() },
      release: grant.release,
      argoTools: grant.argoTools,
    };
  };
}

// Each Engine writes the launcher for its own CLI entry once, at its first private opening.
function cliLauncherOnce(home: string, cliEntry: string): () => string {
  let directory: string | undefined;

  return () => (directory ??= writeCliLauncher(home, cliEntry));
}
