import type { Database } from '@repo/db';
import type { Keypair } from '../pairing/x25519';
import type { WriterActorRef } from '../storage';
import { readSystemInfo } from '../system';
import { ensureServerDevice } from './server-device';
import { ensureServerKeypair, serverPublicKey } from './static-key';

type ServerIdentityOptions = {
  home: string;
  database: Database;
  databaseWriter: WriterActorRef;
  createId: () => string;
  version: string;
  startedAt: string;
};

export interface ServerIdentity {
  readonly keypair: Keypair;
  readonly publicKey: string;
}

function serverPlatform(): 'macos' | 'windows' | 'linux' {
  if (process.platform === 'darwin') return 'macos';

  return process.platform === 'win32' ? 'windows' : 'linux';
}

// The static key and the Server Device's row are made together, once, and kept; answers the keypair the handshake runs on and the public half the QR carries.
export async function ensureServerIdentity(
  options: ServerIdentityOptions,
): Promise<ServerIdentity> {
  const keypair = await ensureServerKeypair(options.home);
  const publicKey = serverPublicKey(keypair);

  await ensureServerDevice(options.database, options.databaseWriter, {
    createId: options.createId,
    publicKey,
    name: readSystemInfo(options).name,
    platform: serverPlatform(),
    now: Date.now(),
  });

  return { keypair, publicKey };
}
