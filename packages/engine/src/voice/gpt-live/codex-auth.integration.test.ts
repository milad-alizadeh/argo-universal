import { describe, expect, it } from 'vitest';
import { fakeCodex, type FakeCodexBehavior } from '#mocks/fake-codex';
import { codexAppServerAuth, type CodexReading } from './codex-auth';

const readWith = (
  behavior: FakeCodexBehavior,
  limits: { timeoutMs?: number } = {},
): Promise<CodexReading> =>
  codexAppServerAuth({ program: fakeCodex(behavior), ...limits }).read();

const answers = (
  authMethod: string | null,
  authToken: string | null,
): FakeCodexBehavior => ({ kind: 'answers', authMethod, authToken });

describe('Codex auth', () => {
  it('reads the ChatGPT token from the app-server, speaking its protocol', async () => {
    expect(await readWith(answers('chatgpt', 'tok-1'))).toEqual({
      signedIn: true,
      token: 'tok-1',
    });
  });

  it('is signed out when Codex uses an API key', async () => {
    expect(await readWith(answers('apikey', 'sk-1'))).toMatchObject({
      signedIn: false,
    });
  });

  it('is signed out, asking to sign in, when Codex holds no login', async () => {
    expect(await readWith(answers(null, null))).toMatchObject({
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

  it('says Codex is not installed when the program cannot be started', async () => {
    const auth = codexAppServerAuth({ program: () => '/nonexistent/codex' });

    expect(await auth.read()).toEqual({
      signedIn: false,
      reason: expect.stringContaining('Install Codex'),
    });
  });

  it('gives up on a Codex that never answers', async () => {
    expect(await readWith({ kind: 'silent' }, { timeoutMs: 300 })).toEqual({
      signedIn: false,
      reason: expect.stringContaining('did not answer'),
    });
  });

  it('gives up on a Codex that exits before it answers', async () => {
    expect(await readWith({ kind: 'exits' })).toEqual({
      signedIn: false,
      reason: expect.stringContaining('did not answer'),
    });
  });

  it('skips lines that are not replies and still reads the answer', async () => {
    const noisy: FakeCodexBehavior = {
      kind: 'noisy',
      authMethod: 'chatgpt',
      authToken: 'tok-2',
    };

    expect(await readWith(noisy)).toEqual({ signedIn: true, token: 'tok-2' });
  });
});
