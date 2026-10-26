import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { memoryStorage } from '../../../../mocks/memory-storage';
import {
  chooseSessionRowPluginShown,
  hiddenSessionRowPluginsQuery,
  isShownOnSessionRows,
} from './session-row-plugins';

function useMemoryStorage(): ReturnType<typeof memoryStorage> {
  const storage = memoryStorage();
  vi.stubGlobal('window', { localStorage: storage });

  return storage;
}

const keptKey = 'session-row-plugins-hidden';

const loadHidden = (client = new QueryClient()): Promise<readonly string[]> =>
  client.fetchQuery(hiddenSessionRowPluginsQuery());

describe('the Plugins hidden on Session rows on this Device', () => {
  it('lists none when this Device kept none, so every Plugin shows', async () => {
    useMemoryStorage();
    const hidden = await loadHidden();

    expect(hidden).toEqual([]);
    expect(isShownOnSessionRows(hidden, 'issues')).toBe(true);
  });

  it('keeps a Plugin turned off for the next App start', async () => {
    useMemoryStorage();
    chooseSessionRowPluginShown(new QueryClient(), 'deploys', false);
    const hidden = await loadHidden();

    expect(hidden).toEqual(['deploys']);
    expect(isShownOnSessionRows(hidden, 'deploys')).toBe(false);
  });

  it('shows a Plugin again once it is turned back on', async () => {
    useMemoryStorage();
    const client = new QueryClient();
    chooseSessionRowPluginShown(client, 'deploys', false);
    chooseSessionRowPluginShown(client, 'coverage', false);
    chooseSessionRowPluginShown(client, 'deploys', true);

    await expect(loadHidden(new QueryClient())).resolves.toEqual(['coverage']);
  });

  it.each([
    ['not JSON', 'deploys'],
    ['not a list', JSON.stringify({ deploys: true })],
  ])('shows every Plugin when the kept list is %s', async (_case, saved) => {
    useMemoryStorage().setItem(keptKey, saved);
    await expect(loadHidden()).resolves.toEqual([]);
  });

  it('is read from this Device storage', async () => {
    useMemoryStorage().setItem(keptKey, JSON.stringify(['coverage']));
    await expect(AsyncStorage.getItem(keptKey)).resolves.not.toBeNull();
    await expect(loadHidden()).resolves.toEqual(['coverage']);
  });
});
