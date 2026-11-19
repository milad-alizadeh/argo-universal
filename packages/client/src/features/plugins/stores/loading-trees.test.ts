import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WireNode } from '@repo/contracts/plugins/wire';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { memoryStorage } from '../../../../mocks/memory-storage';
import { keep } from './loading-trees';

function stubMemoryStorage(): ReturnType<typeof memoryStorage> {
  const storage = memoryStorage();
  vi.stubGlobal('window', { localStorage: storage });

  return storage;
}

const text = (body: string): WireNode => ({
  type: 'Text',
  key: 'body',
  props: { text: body },
  slots: {},
  children: [],
});

const at = (
  projectId: string,
  path = '/issues',
): Parameters<typeof keep>[1] => ({
  serverId: 'server-1',
  page: { pluginId: 'jira', path, projectId },
});

const kept = (projectId: string, path = '/issues'): Promise<string | null> =>
  AsyncStorage.getItem(
    `server-1:plugin-loading-tree:jira:${projectId}:${path}`,
  );

describe('kept loading trees', () => {
  it("keeps one Project's rows apart from another's", async () => {
    stubMemoryStorage();
    const client = new QueryClient();

    keep(client, at('alpha'), text('Alpha issues'));
    keep(client, at('beta'), text('Beta issues'));

    expect(await kept('alpha')).toContain('Alpha issues');
    expect(await kept('beta')).toContain('Beta issues');
  });

  it('writes again only when the first rows change', async () => {
    stubMemoryStorage();
    const client = new QueryClient();
    const write = vi.spyOn(AsyncStorage, 'setItem');

    keep(client, at('alpha', '/board'), text('Board'));
    keep(client, at('alpha', '/board'), text('Board'));
    keep(client, at('alpha', '/board'), text('Board, moved'));

    expect(write).toHaveBeenCalledTimes(2);
    write.mockRestore();
  });

  it('keeps nothing of a page too large to keep', async () => {
    stubMemoryStorage();

    keep(new QueryClient(), at('alpha', '/large'), text('x'.repeat(70_000)));

    expect(await kept('alpha', '/large')).toBeNull();
  });
});
