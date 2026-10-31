import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import type { KnownServer } from '#features/connection';

const serversKey = 'known-servers';

const lookingAtKey = 'looking-at-server';

const Kept = z.object({
  name: z.string(),
  key: z.string(),
  address: z.object({ host: z.string(), port: z.number() }).optional(),
});

// Anything kept that does not read as a Server is dropped, and the Servers beside it are still listed.
const KeptServers = z.array(z.unknown()).catch([]);

function keptServers(saved: string | null): KnownServer[] {
  if (saved === null) return [];

  try {
    return readServers(KeptServers.parse(JSON.parse(saved)));
  } catch {
    return [];
  }
}

const readServers = (kept: readonly unknown[]): KnownServer[] =>
  kept.flatMap((entry): KnownServer[] => {
    const read = Kept.safeParse(entry);

    return read.success ? [read.data] : [];
  });

// Writes run one after another, so the last list is the one kept, and a read waits for them.
let writes = Promise.resolve();

// The Servers this Device has paired with, as Pairing kept them (ADR-0045).
export async function loadKnownServers(): Promise<KnownServer[]> {
  await writes;

  return keptServers(await AsyncStorage.getItem(serversKey).catch(loadFailed));
}

// The Server this App was last looking at, so it opens on the same one; null before it has ever been chosen.
export async function loadLookedAtServer(): Promise<string | null> {
  await writes;

  return AsyncStorage.getItem(lookingAtKey).catch(loadFailed);
}

function loadFailed(cause: unknown): null {
  console.error('Could not load the list of Servers', cause);

  return null;
}

// Pairing writes this list; the App only reads it, so a Server appears here when a Device has paired and not before.
export function keepLookedAtServer(id: string): void {
  writes = writes
    .then(() => AsyncStorage.setItem(lookingAtKey, id))
    .catch(keepFailed);
}

function keepFailed(cause: unknown): void {
  console.error('Could not keep the list of Servers', cause);
}
