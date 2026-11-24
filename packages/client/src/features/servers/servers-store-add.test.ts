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
async function readingServers(
  forgetMedia?: (serverId: string) => void,
): Promise<ServersStore> {
  vi.stubGlobal('window', { localStorage: memoryStorage() });

  const store = createServersStore('ws://127.0.0.1:4000', forgetMedia);

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

  it('keeps the other addresses the invite carried, and reads an entry without them', async () => {
    const store = await readingServers();
    const tailnet = { host: `100.101.102.${7}`, port: 4000 };
    const reachable = { ...studio, otherAddresses: [tailnet] };

    store.add(reachable);
    store.add(bench);

    await vi.waitFor(async () => {
      expect(await loadKnownServers()).toEqual([reachable, bench]);
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

describe('removing a Server this Device has unpaired from', () => {
  it('drops it from the list and from what is kept, and shows the own Server instead', async () => {
    const store = await readingServers();

    store.add(studio);
    store.add(bench);
    store.remove(bench.key);

    const { servers, lookingAt } = store.getSnapshot();

    expect(servers.map((server) => server.id)).toEqual([ownId, studio.key]);
    expect(lookingAt).toBe(ownId);
    await vi.waitFor(async () => {
      expect(await loadKnownServers()).toEqual([studio]);
      expect(await loadLookedAtServer()).toBe(ownId);
    });
  });

  it('wipes the images kept on the Device for that Server alone', async () => {
    const forgotten: string[] = [];
    const store = await readingServers((id) => forgotten.push(id));

    store.add(studio);
    store.add(bench);
    store.remove(bench.key);
    store.remove(ownId);

    expect(forgotten).toEqual([bench.key]);
  });

  it('never removes the Server on this Device', async () => {
    const store = await readingServers();

    store.remove(ownId);

    expect(store.getSnapshot().servers.map((server) => server.id)).toEqual([
      ownId,
    ]);
  });

  it('lists a Server paired again after it was removed', async () => {
    const store = await readingServers();

    store.add(studio);
    store.remove(studio.key);
    store.add(studio);

    expect(store.getSnapshot().servers.map((server) => server.id)).toEqual([
      ownId,
      studio.key,
    ]);
  });
});
