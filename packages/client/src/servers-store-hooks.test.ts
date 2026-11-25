import AsyncStorage from '@react-native-async-storage/async-storage';
import { expect, it, vi } from 'vitest';
import { memoryStorage } from '../mocks/memory-storage';
import {
  forgetServerMedia,
  rememberServerMedia,
} from './features/connection/api/channel/media-store';
import {
  forgetServerCache,
  rememberServerCache,
} from './features/servers/server-cache-store';
import { createServersStore } from './features/servers/servers-store';
import { serversStoreHooks } from './servers-store-hooks';

const studio = { name: 'Studio', key: 'studio-key' };

it('wipes what the App kept of a Server through the hooks the App uses', async () => {
  vi.stubGlobal('window', { localStorage: memoryStorage() });
  const store = createServersStore(undefined, serversStoreHooks);
  const kept = `query-cache:${studio.key}:-feed`;

  store.add(studio);
  await AsyncStorage.setItem(kept, '{}');
  store.remove(studio.key);

  await vi.waitFor(async () =>
    expect(await AsyncStorage.getItem(kept)).toBeNull(),
  );
});

it('wipes both the images and the query cache, and lifts both when a Server is added again', () => {
  expect(serversStoreHooks).toEqual({
    onForgotten: [forgetServerMedia, forgetServerCache],
    onAdded: [rememberServerMedia, rememberServerCache],
  });
});
