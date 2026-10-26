import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { memoryStorage } from '../../../../mocks/memory-storage';
import {
  chooseSlotOwner,
  chooseSlotPluginShown,
  type SlotChoices,
  slotChoicesQuery,
} from './slot-choices';

function useMemoryStorage(): ReturnType<typeof memoryStorage> {
  const storage = memoryStorage();
  vi.stubGlobal('window', { localStorage: storage });

  return storage;
}

const slotId = 'argo/session/row/v1';

const keptKey = `slot-choices:${slotId}`;

const loadChoices = (client = new QueryClient()): Promise<SlotChoices> =>
  client.query(slotChoicesQuery(slotId));

const loadHidden = async (client?: QueryClient): Promise<readonly string[]> =>
  (await loadChoices(client)).hidden;

describe('the Plugins hidden in a Slot on this Device', () => {
  it('lists none when this Device kept none, so every Plugin shows', async () => {
    useMemoryStorage();
    const choices = await loadChoices();

    expect(choices).toEqual({ hidden: [], owner: null });
    expect(choices.hidden).not.toContain('issues');
  });

  it('keeps a Plugin turned off for the next App start', async () => {
    useMemoryStorage();
    await chooseSlotPluginShown(new QueryClient(), slotId, {
      pluginId: 'deploys',
      shown: false,
    });
    const choices = await loadChoices();

    expect(choices.hidden).toEqual(['deploys']);
    expect(choices.hidden).toContain('deploys');
  });

  it('shows a Plugin again once it is turned back on', async () => {
    useMemoryStorage();
    const client = new QueryClient();
    await chooseSlotPluginShown(client, slotId, {
      pluginId: 'deploys',
      shown: false,
    });
    await chooseSlotPluginShown(client, slotId, {
      pluginId: 'coverage',
      shown: false,
    });
    await chooseSlotPluginShown(client, slotId, {
      pluginId: 'deploys',
      shown: true,
    });

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
      JSON.stringify({ hidden: ['coverage'], owner: null }),
    );
    await expect(AsyncStorage.getItem(keptKey)).resolves.not.toBeNull();
    await expect(loadHidden()).resolves.toEqual(['coverage']);
  });

  it('keeps the replaceable part owner beside the switches', async () => {
    useMemoryStorage();
    const client = new QueryClient();
    await chooseSlotPluginShown(client, slotId, {
      pluginId: 'coverage',
      shown: false,
    });
    await chooseSlotOwner(client, slotId, 'issue-tracker');

    await expect(loadChoices()).resolves.toEqual({
      hidden: ['coverage'],
      owner: 'issue-tracker',
    });
  });

  it('keeps a choice made before the kept ones loaded', async () => {
    useMemoryStorage().setItem(
      keptKey,
      JSON.stringify({ hidden: ['coverage'], owner: null }),
    );
    await chooseSlotPluginShown(new QueryClient(), slotId, {
      pluginId: 'deploys',
      shown: false,
    });

    await expect(loadHidden()).resolves.toEqual(['coverage', 'deploys']);
  });

  it('keeps each Slot apart', async () => {
    useMemoryStorage();
    await chooseSlotPluginShown(new QueryClient(), 'other/slot/v1', {
      pluginId: 'deploys',
      shown: false,
    });

    await expect(loadHidden()).resolves.toEqual([]);
  });
});
