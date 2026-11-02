import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import type { KnownServer } from '#features/connection';
import { ownServerId } from '#lib/product/server-scope';

const serversKey = 'known-servers';

const lookingAtKey = 'looking-at-server';

const highestPort = 65_535;

const Address = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(highestPort),
});

/*
 * A Server as Pairing kept it. The address is read on its own, so an address that does not read as one costs only the
 * address: the Server is still listed, as unreachable, rather than disappearing from the list altogether.
 */
const Kept = z.object({
  name: z.string(),
  key: z.string().min(1),
  address: z.unknown().optional(),
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

type KeptServer = z.infer<typeof Kept>;

// The Servers the App can hold, from what is kept.
function readServers(kept: readonly unknown[]): KnownServer[] {
  const servers = new Map<string, KnownServer>();

  for (const entry of kept) keepServer(servers, Kept.safeParse(entry).data);

  return [...servers.values()];
}

function keepServer(
  servers: Map<string, KnownServer>,
  kept: KeptServer | undefined,
): void {
  if (!kept) return;

  if (canList(servers, kept)) servers.set(kept.key, knownServer(kept));
}

/*
 * A key kept twice is listed once, the first entry winning, and the id of the Server on this Device is refused:
 * either would shadow another Server's Connection, and the preferences kept under its id with it.
 */
const canList = (
  servers: ReadonlyMap<string, KnownServer>,
  kept: KeptServer,
): boolean => kept.key !== ownServerId && !servers.has(kept.key);

const knownServer = ({ name, key, address }: KeptServer): KnownServer => {
  const read = Address.safeParse(address);

  return { name, key, ...(read.success && { address: read.data }) };
};

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

export function keepLookedAtServer(id: string): void {
  writes = writes
    .then(() => AsyncStorage.setItem(lookingAtKey, id))
    .catch(keepFailed);
}

/*
 * Writes a Server that has just paired: its key, its discovery name and the address it answered on (ADR-0045). A Server paired again replaces its own entry, so a new address or name never lists it twice.
 * Entries this file cannot read are kept as they are, so one bad entry never costs the Servers beside it.
 */
export function keepKnownServer(server: KnownServer): Promise<void> {
  writes = writes.then(() => writeServer(server)).catch(keepFailed);

  return writes;
}

async function writeServer(server: KnownServer): Promise<void> {
  const kept = await AsyncStorage.getItem(serversKey);

  const entries = keptEntries(kept).filter(
    (entry) => Kept.safeParse(entry).data?.key !== server.key,
  );

  await AsyncStorage.setItem(serversKey, JSON.stringify([...entries, server]));
}

// Forgets a Server this Device has unpaired from: its entry goes, and so does the choice to look at it.
export function forgetKnownServer(key: string): Promise<void> {
  writes = writes.then(() => removeServer(key)).catch(keepFailed);

  return writes;
}

async function removeServer(key: string): Promise<void> {
  const kept = await AsyncStorage.getItem(serversKey);

  const entries = keptEntries(kept).filter(
    (entry) => Kept.safeParse(entry).data?.key !== key,
  );

  await AsyncStorage.setItem(serversKey, JSON.stringify(entries));

  if ((await AsyncStorage.getItem(lookingAtKey)) === key)
    await AsyncStorage.setItem(lookingAtKey, ownServerId);
}

function keptEntries(saved: string | null): unknown[] {
  try {
    return saved === null ? [] : KeptServers.parse(JSON.parse(saved));
  } catch {
    return [];
  }
}

function keepFailed(cause: unknown): void {
  console.error('Could not keep the list of Servers', cause);
}
