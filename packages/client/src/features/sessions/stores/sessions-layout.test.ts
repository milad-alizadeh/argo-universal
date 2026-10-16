import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { memoryStorage } from '../../../../mocks/memory-storage';
import { chooseSessionsLayout, sessionsLayoutQuery } from './sessions-layout';

function useMemoryStorage(): void {
  vi.stubGlobal('window', { localStorage: memoryStorage() });
}

const loadLayout = (client = new QueryClient()): Promise<string> =>
  client.fetchQuery(sessionsLayoutQuery());

describe('the Sessions layout on this Device', () => {
  it('is Regular when this Device kept none', async () => {
    useMemoryStorage();
    await expect(loadLayout()).resolves.toBe('regular');
  });

  it('keeps a choice for the next App start', async () => {
    useMemoryStorage();
    chooseSessionsLayout(new QueryClient(), 'compact');
    await expect(loadLayout()).resolves.toBe('compact');
  });

  it('keeps a choice made while an older read is still loading', async () => {
    useMemoryStorage();
    const client = new QueryClient();
    const olderRead = Promise.withResolvers<string | null>();
    vi.spyOn(AsyncStorage, 'getItem').mockReturnValue(olderRead.promise);
    const loading = loadLayout(client).catch(() => null);
    chooseSessionsLayout(client, 'compact');
    olderRead.resolve('regular');
    await loading;
    expect(client.getQueryData(sessionsLayoutQuery().queryKey)).toBe('compact');
  });

  it('stays Regular when the kept layout cannot be read', async () => {
    useMemoryStorage();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(AsyncStorage, 'getItem').mockRejectedValue(
      new Error('Storage is unavailable'),
    );
    await expect(loadLayout()).resolves.toBe('regular');
  });
});
