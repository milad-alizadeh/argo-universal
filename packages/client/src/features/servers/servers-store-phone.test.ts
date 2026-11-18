import AsyncStorage from '@react-native-async-storage/async-storage';
import { describe, expect, it, vi } from 'vitest';
import { memoryStorage } from '../../../mocks/memory-storage';
import { createServersStore, type ServersStore } from './servers-store';

const studioKey = 'studio-key';

const studio = {
  name: 'Studio',
  key: studioKey,
  address: { host: 'studio.local', port: 4000 },
};

// The store reads what is kept once, on its first reader.
async function listed(store: ServersStore): Promise<void> {
  await new Promise<void>((read) => {
    const stop = store.subscribe(() => {
      stop();
      read();
    });
  });
}

// A phone runs no Server of its own, so it is given no URL for one.
async function phoneKeeping(kept: readonly unknown[]): Promise<ServersStore> {
  vi.stubGlobal('window', { localStorage: memoryStorage() });
  await AsyncStorage.setItem('known-servers', JSON.stringify(kept));

  const store = createServersStore();
  await listed(store);

  return store;
}

describe("a phone's list of Servers", () => {
  it('lists no Server of its own, so This computer never shows', async () => {
    const store = await phoneKeeping([]);

    expect(store.getSnapshot().servers).toEqual([]);
  });

  it('opens on a Server it paired with, having none of its own to fall back on', async () => {
    const store = await phoneKeeping([studio]);

    expect(store.getSnapshot().lookingAt).toBe(studioKey);
  });

  it('holds no Server once the last one it paired with is removed', async () => {
    const store = await phoneKeeping([studio]);

    store.remove(studioKey);

    expect(store.getSnapshot().servers).toEqual([]);
  });
});
