import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { onTestFinished } from 'vitest';

// A per-test path for the scripted Agent's stored sign-in; absent = signed out.
export const agentCredentials = (
  { signedIn }: { signedIn: boolean } = { signedIn: false },
): string => {
  const directory = mkdtempSync(join(tmpdir(), 'argo-agent-credentials-'));
  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
  const credentials = join(directory, 'credentials');

  if (signedIn) writeFileSync(credentials, 'signed-in');

  return credentials;
};
