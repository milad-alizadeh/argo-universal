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

// Where this Device keeps the view.
const viewKey = 'sessions-view';

const loadView = (client = new QueryClient()): Promise<SessionsView> =>
  client.fetchQuery(sessionsViewQuery());

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
    chooseSessionsView(new QueryClient(), chosen);
    await expect(loadView()).resolves.toEqual(chosen);
  });

  it('keeps the layout this Device kept before it kept the whole view', async () => {
    useMemoryStorage().setItem('sessions-layout', 'compact');
    await expect(loadView()).resolves.toEqual({
      ...defaults,
      layout: 'compact',
    });
  });

  it('drops the order this Device kept before the list always ordered by last activity', async () => {
    useMemoryStorage().setItem(
      viewKey,
      JSON.stringify({ ...chosen, order: 'created' }),
    );
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
    chooseSessionsView(client, chosen);
    olderRead.resolve(JSON.stringify(defaults));
    await loading;
    expect(client.getQueryData(sessionsViewQuery().queryKey)).toEqual(chosen);
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
