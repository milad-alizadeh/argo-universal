import { randomBytes, timingSafeEqual } from 'node:crypto';
import { chmod, writeFile } from 'node:fs/promises';
import { controlTokenPath, readControlToken } from '../server-runtime';
import type { SessionTokens, TokenCaller } from './session-tokens';

const tokenBytes = 32;

const privateFileMode = 0o600;

function alreadyExists(cause: unknown): boolean {
  return cause instanceof Error && 'code' in cause && cause.code === 'EEXIST';
}

async function createControlToken(path: string): Promise<void> {
  try {
    await writeFile(path, randomBytes(tokenBytes).toString('hex'), {
      flag: 'wx',
      mode: privateFileMode,
    });
  } catch (cause) {
    if (!alreadyExists(cause)) throw cause;
  }
}

// Makes the user token on the Server's first start and keeps its file private.
export async function ensureControlToken(home: string): Promise<string> {
  const path = controlTokenPath(home);

  await createControlToken(path);
  await chmod(path, privateFileMode);

  return readControlToken(home);
}

export function tokensMatch(expected: string, supplied: string): boolean {
  const candidate = Buffer.from(supplied);
  const token = Buffer.from(expected);

  return candidate.length === token.length && timingSafeEqual(candidate, token);
}

// Who a token belongs to: the user for the control token, else the live Session holding it, else UNAUTHORIZED.
export function authenticate(
  tokens: { controlToken: string; sessionTokens: SessionTokens },
  token: string | undefined,
): TokenCaller {
  if (token && tokensMatch(tokens.controlToken, token)) return { kind: 'user' };

  return tokens.sessionTokens.require(token);
}
