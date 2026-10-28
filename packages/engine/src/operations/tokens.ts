import { randomBytes, timingSafeEqual } from 'node:crypto';
import { chmod, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { TRPCError } from '@trpc/server';

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

export async function readControlToken(home: string): Promise<string> {
  const path = join(home, 'control.token');

  await createControlToken(path);
  await chmod(path, privateFileMode);

  return (await readFile(path, 'utf8')).trim();
}

function tokensMatch(expected: string, supplied: string): boolean {
  const candidate = Buffer.from(supplied);
  const token = Buffer.from(expected);

  return candidate.length === token.length && timingSafeEqual(candidate, token);
}

export function requireUserToken(
  expected: string,
  supplied: string | undefined,
): void {
  if (supplied && tokensMatch(expected, supplied)) return;
  throw new TRPCError({
    code: 'UNAUTHORIZED',
    message: 'An Argo token is required',
  });
}
