import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { codexAppServerAuth } from './codex-auth';

// A stand-in `codex app-server`: answers initialize, then getAuthStatus with the given result.
function fakeCodex(result: Record<string, string | null>): string {
  const directory = mkdtempSync(path.join(tmpdir(), 'fake-codex-'));
  const program = path.join(directory, 'codex');
  writeFileSync(
    program,
    `#!/usr/bin/env node
const readline = require('node:readline');
const lines = readline.createInterface({ input: process.stdin });
lines.on('line', (line) => {
  const message = JSON.parse(line);
  if (message.method === 'initialize')
    console.log(JSON.stringify({ id: message.id, result: { userAgent: 'fake' } }));
  if (message.method === 'getAuthStatus' && message.params.includeToken === true)
    console.log(JSON.stringify({ id: message.id, result: ${JSON.stringify(result)} }));
});
`,
  );
  chmodSync(program, 0o755);

  return program;
}

describe('Codex auth', () => {
  it('reads the ChatGPT token from the app-server', async () => {
    const auth = codexAppServerAuth({
      program: () => fakeCodex({ authMethod: 'chatgpt', authToken: 'tok-1' }),
    });

    expect(await auth.read()).toEqual({ signedIn: true, token: 'tok-1' });
  });

  it('is signed out when Codex uses an API key', async () => {
    const auth = codexAppServerAuth({
      program: () => fakeCodex({ authMethod: 'apikey', authToken: 'sk-1' }),
    });

    expect(await auth.read()).toMatchObject({ signedIn: false });
  });

  it('is signed out when Codex holds no login', async () => {
    const auth = codexAppServerAuth({
      program: () => fakeCodex({ authMethod: null, authToken: null }),
    });

    expect(await auth.read()).toMatchObject({
      signedIn: false,
      reason: expect.stringContaining('Sign in'),
    });
  });

  it('says Codex is not installed when no program is found', async () => {
    const auth = codexAppServerAuth({
      program: () => {
        throw new Error('not found');
      },
    });

    expect(await auth.read()).toEqual({
      signedIn: false,
      reason: expect.stringContaining('Install Codex'),
    });
  });
});
