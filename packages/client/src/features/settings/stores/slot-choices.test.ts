import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { memoryStorage } from '../../../../mocks/memory-storage';
import {
  chooseActivityLineOwner,
  chooseSessionRowPluginShown,
  isShownOnSessionRows,
  type SessionRowChoices,
  sessionRowChoicesQuery,
} from './session-row-plugins';

function useMemoryStorage(): ReturnType<typeof memoryStorage> {
  const storage = memoryStorage();
  vi.stubGlobal('window', { localStorage: storage });

  return storage;
}

const keptKey = 'session-row-plugins';

const loadChoices = (client = new QueryClient()): Promise<SessionRowChoices> =>
  client.query(sessionRowChoicesQuery());

const loadHidden = async (client?: QueryClient): Promise<readonly string[]> =>
  (await loadChoices(client)).hidden;

describe('the Plugins hidden on Session rows on this Device', () => {
  it('lists none when this Device kept none, so every Plugin shows', async () => {
    useMemoryStorage();
    const choices = await loadChoices();

    expect(choices).toEqual({ hidden: [], activityOwner: null });
    expect(isShownOnSessionRows(choices, 'issues')).toBe(true);
  });

  it('keeps a Plugin turned off for the next App start', async () => {
    useMemoryStorage();
    await chooseSessionRowPluginShown(new QueryClient(), 'deploys', false);
    const choices = await loadChoices();

    expect(choices.hidden).toEqual(['deploys']);
    expect(isShownOnSessionRows(choices, 'deploys')).toBe(false);
  });

  it('shows a Plugin again once it is turned back on', async () => {
    useMemoryStorage();
    const client = new QueryClient();
    await chooseSessionRowPluginShown(client, 'deploys', false);
    await chooseSessionRowPluginShown(client, 'coverage', false);
    await chooseSessionRowPluginShown(client, 'deploys', true);

    await expect(loadHidden(new QueryClient())).resolves.toEqual(['coverage']);
  });

  it.each([
    ['not JSON', 'deploys'],
    ['not the choices', JSON.stringify(['deploys'])],
  ])('shows every Plugin when the kept list is %s', async (_case, saved) => {
    useMemoryStorage().setItem(keptKey, saved);
    await expect(loadHidden()).resolves.toEqual([]);
  });

  it('is read from this Device storage', async () => {
    useMemoryStorage().setItem(
      keptKey,
      JSON.stringify({ hidden: ['coverage'], activityOwner: null }),
    );
    await expect(AsyncStorage.getItem(keptKey)).resolves.not.toBeNull();
    await expect(loadHidden()).resolves.toEqual(['coverage']);
  });

  it('keeps the Activity line owner beside the switches', async () => {
    useMemoryStorage();
    const client = new QueryClient();
    await chooseSessionRowPluginShown(client, 'coverage', false);
    await chooseActivityLineOwner(client, 'issue-tracker');

    await expect(loadChoices()).resolves.toEqual({
      hidden: ['coverage'],
      activityOwner: 'issue-tracker',
    });
  });

  it('keeps a choice made before the kept ones loaded', async () => {
    useMemoryStorage().setItem(
      keptKey,
      JSON.stringify({ hidden: ['coverage'], activityOwner: null }),
    );
    await chooseSessionRowPluginShown(new QueryClient(), 'deploys', false);

    await expect(loadHidden()).resolves.toEqual(['coverage', 'deploys']);
  });
});
