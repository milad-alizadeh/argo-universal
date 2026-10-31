import AsyncStorage from '@react-native-async-storage/async-storage';
import { describe, expect, it, vi } from 'vitest';
import { memoryStorage } from '../../../mocks/memory-storage';
import { loadLookedAtServer } from './known-servers';
import { createServersStore, type ServersStore } from './servers-store';

function memoryStorageWindow(): ReturnType<typeof memoryStorage> {
  const storage = memoryStorage();
  vi.stubGlobal('window', { localStorage: storage });

  return storage;
}

const ownUrl = 'ws://127.0.0.1:4000';

const ownId = 'server-device';

const ownName = 'This computer';

const studioKey = 'studio-key';

const benchKey = 'bench-key';

const studio = {
  name: 'Studio',
  key: studioKey,
  address: { host: 'studio.local', port: 4000 },
};

// A Server paired but never reached from this network: the App has no address to open a Connection to.
const bench = { name: 'Workshop bench', key: benchKey };

async function keep(
  servers: readonly unknown[],
  lookingAt?: string,
): Promise<void> {
  await AsyncStorage.setItem('known-servers', JSON.stringify(servers));

  if (lookingAt !== undefined)
    await AsyncStorage.setItem('looking-at-server', lookingAt);
}

// The store reads what is kept once, on its first reader.
async function listed(store: ServersStore): Promise<void> {
  await new Promise<void>((read) => {
    const stop = store.subscribe(() => {
      stop();
      read();
    });
  });
}

async function readingServers(
  kept: readonly unknown[],
  lookingAt?: string,
): Promise<ServersStore> {
  memoryStorageWindow();
  await keep(kept, lookingAt);

  const store = createServersStore(ownUrl);
  await listed(store);

  return store;
}

describe("the App's list of Servers", () => {
  it('lists the Server on this Device, alone, before anything is read', () => {
    memoryStorageWindow();

    expect(createServersStore(ownUrl).getSnapshot()).toEqual({
      servers: [{ id: ownId, name: ownName, serverDevice: true, url: ownUrl }],
      lookingAt: ownId,
    });
  });

  it('lists every Server this Device has paired with, its own first', async () => {
    const { servers } = (await readingServers([studio, bench])).getSnapshot();

    expect(servers.map((server) => server.name)).toEqual([
      ownName,
      'Studio',
      'Workshop bench',
    ]);
    expect(servers.map((server) => server.serverDevice)).toEqual([
      true,
      false,
      false,
    ]);
  });

  it('opens on the Server it was last looking at', async () => {
    const store = await readingServers([studio], studioKey);

    expect(store.getSnapshot().lookingAt).toBe(studioKey);
  });

  it('keeps the Server it is told to look at, so the App opens on it again', async () => {
    const store = await readingServers([studio]);

    store.look(studioKey);

    expect(store.getSnapshot().lookingAt).toBe(studioKey);
    // Read the way the App reads it when it opens again, which waits for the write.
    await expect(loadLookedAtServer()).resolves.toBe(studioKey);
  });

  it('goes on showing the Server it holds when told to look at one it does not', async () => {
    const store = await readingServers([]);

    store.look('never-paired');

    expect(store.getSnapshot().lookingAt).toBe(ownId);
  });

  it('goes on showing a Server rather than one it has no address for', async () => {
    const store = await readingServers([bench]);

    store.look(benchKey);

    expect(store.getSnapshot().servers).toHaveLength(2);
    expect(store.getSnapshot().lookingAt).toBe(ownId);
  });

  it('shows its own Server when the one it was looking at is no longer paired', async () => {
    const store = await readingServers([studio], 'unpaired-key');

    expect(store.getSnapshot().lookingAt).toBe(ownId);
  });

  it('lists the Servers beside an entry that is not a Server at all', async () => {
    const store = await readingServers([{ name: 'Nameless' }, studio]);

    expect(store.getSnapshot().servers.map((server) => server.id)).toEqual([
      ownId,
      studioKey,
    ]);
  });
});
