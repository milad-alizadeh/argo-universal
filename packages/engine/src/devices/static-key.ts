import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
} from 'node:crypto';
import { chmod, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const keyFile = 'server.key';

const privateFileMode = 0o600;

const keyPath = (home: string): string => join(home, keyFile);

function alreadyExists(cause: unknown): boolean {
  return cause instanceof Error && 'code' in cause && cause.code === 'EEXIST';
}

async function createStaticKey(path: string): Promise<void> {
  const { privateKey } = generateKeyPairSync('x25519');

  try {
    await writeFile(path, privateKey.export({ type: 'pkcs8', format: 'pem' }), {
      flag: 'wx',
      mode: privateFileMode,
    });
  } catch (cause) {
    if (!alreadyExists(cause)) throw cause;
  }
}

// Makes the Server's static keypair on its first start, keeps its file private and answers the public half (ADR-0045).
export async function ensureServerPublicKey(home: string): Promise<string> {
  const path = keyPath(home);

  await createStaticKey(path);
  await chmod(path, privateFileMode);

  return createPublicKey(createPrivateKey(await readFile(path)))
    .export({ type: 'spki', format: 'der' })
    .toString('base64url');
}
