import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { memoryStorage } from '../../../../mocks/memory-storage';
import {
  chooseSessionsView,
  type SessionsView,
  sessionsViewQuery,
} from './sessions-view';

function useMemoryStorage(): ReturnType<typeof memoryStorage> {
  const storage = memoryStorage();
  vi.stubGlobal('window', { localStorage: storage });

  return storage;
}

// The Server whose Sessions the view is for, and where this Device keeps it.
const serverId = 'server-device';

const viewKey = `${serverId}:sessions-view`;

const loadView = (
  client = new QueryClient(),
  server = serverId,
): Promise<SessionsView> => client.fetchQuery(sessionsViewQuery(server));

const defaults: SessionsView = {
  group: 'project',
  status: 'active',
  layout: 'regular',
};

const chosen: SessionsView = {
  group: 'none',
  status: 'all',
  layout: 'compact',
};

describe('the Sessions view on this Device', () => {
  it('is By project, Active and Regular when this Device kept none', async () => {
    useMemoryStorage();
    await expect(loadView()).resolves.toEqual(defaults);
  });

  it('keeps a choice for the next App start', async () => {
    useMemoryStorage();
    chooseSessionsView(new QueryClient(), serverId, chosen);
    await expect(loadView()).resolves.toEqual(chosen);
  });

  it.each([
    ['an unknown value', JSON.stringify({ ...chosen, status: 'pinned' })],
    ['a missing field', JSON.stringify({ ...chosen, status: undefined })],
  ])('falls back to the default for a field with %s', async (_case, saved) => {
    useMemoryStorage().setItem(viewKey, saved);
    await expect(loadView()).resolves.toEqual({
      ...chosen,
      status: 'active',
    });
  });

  it('falls back to the default view when the kept view is not JSON', async () => {
    useMemoryStorage().setItem(viewKey, 'compact');
    await expect(loadView()).resolves.toEqual(defaults);
  });

  it('keeps a choice made while an older read is still loading', async () => {
    useMemoryStorage();
    const client = new QueryClient();
    const olderRead = Promise.withResolvers<string | null>();
    vi.spyOn(AsyncStorage, 'getItem').mockReturnValue(olderRead.promise);
    const loading = loadView(client).catch(() => null);
    chooseSessionsView(client, serverId, chosen);
    olderRead.resolve(JSON.stringify(defaults));
    await loading;
    expect(client.getQueryData(sessionsViewQuery(serverId).queryKey)).toEqual(
      chosen,
    );
  });

  it('keeps a view for each Server, so one Server does not change the other', async () => {
    useMemoryStorage();
    chooseSessionsView(new QueryClient(), serverId, chosen);

    await expect(
      loadView(new QueryClient(), 'other-computer'),
    ).resolves.toEqual(defaults);
    await expect(loadView()).resolves.toEqual(chosen);
  });

  it('keeps the default view when the kept view cannot be read', async () => {
    useMemoryStorage();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(AsyncStorage, 'getItem').mockRejectedValue(
      new Error('Storage is unavailable'),
    );
    await expect(loadView()).resolves.toEqual(defaults);
  });
});
