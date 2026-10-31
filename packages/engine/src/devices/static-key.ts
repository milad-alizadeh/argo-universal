import { generateKeyPairSync } from 'node:crypto';
import { chmod, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  keypairFromPem,
  storedPublicKey,
  type Keypair,
} from '../pairing/x25519';

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

// Makes the Server's static keypair on its first start and keeps its file private; the handshake runs on the private half and the QR carries the public one (ADR-0045).
export async function ensureServerKeypair(home: string): Promise<Keypair> {
  const path = keyPath(home);

  await createStaticKey(path);
  await chmod(path, privateFileMode);

  return keypairFromPem(await readFile(path));
}

export const serverPublicKey = (keypair: Keypair): string =>
  storedPublicKey(keypair.publicKey);
