import { describe, expect, it, vi } from 'vitest';
import { memoryStorage } from '../../../mocks/memory-storage';
import { loadKnownServers, loadLookedAtServer } from './known-servers';
import { createServersStore, type ServersStore } from './servers-store';

const ownId = 'server-device';

const studio = {
  name: 'Studio',
  key: 'studio-key',
  address: { host: 'studio.local', port: 4000 },
};

const bench = { name: 'Workshop bench', key: 'bench-key' };

// The store reads what is kept once, on its first reader.
async function readingServers(): Promise<ServersStore> {
  vi.stubGlobal('window', { localStorage: memoryStorage() });

  const store = createServersStore('ws://127.0.0.1:4000');

  await new Promise<void>((read) => {
    const stop = store.subscribe(() => {
      stop();
      read();
    });
  });

  return store;
}

describe('adding a Server that has just paired', () => {
  it('lists it, shows it, and keeps it so a restart opens on it', async () => {
    const store = await readingServers();

    store.add(studio);

    const { servers, lookingAt } = store.getSnapshot();

    expect(servers.map((server) => server.id)).toEqual([ownId, studio.key]);
    expect(lookingAt).toBe(studio.key);
    // Keeping is written behind the screen, so it is awaited rather than assumed.
    await vi.waitFor(async () => {
      expect(await loadKnownServers()).toEqual([studio]);
      expect(await loadLookedAtServer()).toBe(studio.key);
    });
  });

  it('lists a Server paired again once, at the address it answered on this time', async () => {
    const store = await readingServers();
    const moved = { ...studio, address: { host: 'moved.local', port: 4001 } };

    store.add(studio);
    store.add(bench);
    store.add(moved);

    const { servers } = store.getSnapshot();

    expect(servers.map((server) => server.id)).toEqual([
      ownId,
      bench.key,
      studio.key,
    ]);
    await vi.waitFor(async () => {
      expect(await loadKnownServers()).toEqual([bench, moved]);
    });
  });
});
