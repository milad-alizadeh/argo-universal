import { randomUUID } from 'node:crypto';
import {
  mkdirSync,
  readlinkSync,
  renameSync,
  symlinkSync,
  unlinkSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AcpResourceInput } from '../agents';
import type { SessionTokens } from './session-tokens';

const cliEntry = fileURLToPath(
  new URL('../../../../apps/cli/bin/argo.mjs', import.meta.url),
);

function alreadyExists(cause: unknown): boolean {
  if (!(cause instanceof Error)) return false;

  return 'code' in cause && cause.code === 'EEXIST';
}

function updateLink(link: string): void {
  if (readlinkSync(link) === cliEntry) return;
  const temporary = `${link}.${randomUUID()}`;
  symlinkSync(cliEntry, temporary);

  try {
    renameSync(temporary, link);
  } catch (error) {
    unlinkSync(temporary);
    throw error;
  }
}

function cliDirectory(home: string): string {
  const directory = join(home, 'cli', 'bin');
  mkdirSync(directory, { recursive: true });
  const link = join(directory, 'argo');

  try {
    symlinkSync(cliEntry, link);
  } catch (cause) {
    if (!alreadyExists(cause)) throw cause;
    updateLink(link);
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
