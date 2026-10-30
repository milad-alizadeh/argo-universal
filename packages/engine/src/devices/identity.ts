import type { Database } from '@repo/db';
import type { WriterActorRef } from '../storage';
import { readSystemInfo } from '../system';
import { ensureServerDevice } from './server-device';
import { ensureServerPublicKey } from './static-key';

type ServerIdentityOptions = {
  home: string;
  database: Database;
  databaseWriter: WriterActorRef;
  createId: () => string;
  version: string;
  startedAt: string;
};

function serverPlatform(): 'macos' | 'windows' | 'linux' {
  if (process.platform === 'darwin') return 'macos';

  return process.platform === 'win32' ? 'windows' : 'linux';
}

// The static key and the Server Device's row are made together, once, and kept; answers the public key.
export async function ensureServerIdentity(
  options: ServerIdentityOptions,
): Promise<string> {
  const publicKey = await ensureServerPublicKey(options.home);
  await ensureServerDevice(options.database, options.databaseWriter, {
    createId: options.createId,
    publicKey,
    name: readSystemInfo(options).name,
    platform: serverPlatform(),
    now: Date.now(),
  });

  return publicKey;
}
