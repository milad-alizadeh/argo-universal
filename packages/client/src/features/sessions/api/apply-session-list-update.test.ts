import type {
  SessionInfo,
  SessionListInput,
  SessionListOutput,
} from '@repo/contracts';
import { sessionRows } from '@repo/mocks/app';
import { type InfiniteData, QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { applySessionListUpdate } from './apply-session-list-update';

const list = { queryKey: [['session', 'list']] };

const keyFor = (input: SessionListInput): unknown[] => [
  ['session', 'list'],
  { input, type: 'infinite' },
];

const listKey = keyFor({});

const session = (
  sessionId: string,
  createdAt: number,
  extra: Partial<SessionInfo> = {},
): SessionInfo => ({
  ...sessionRows.idle,
  sessionId,
  createdAt,
  title: sessionId,
  activity: '',
  ...extra,
});

function listWith(
  sessions: SessionInfo[],
  nextCursor: string | null,
  input: SessionListInput = {},
): QueryClient {
  const client = new QueryClient();

  const data: InfiniteData<SessionListOutput, null> = {
    pages: [{ sessions, nextCursor }],
    pageParams: [null],
  };

  client.setQueryData(keyFor(input), data);

  return client;
}

const shown = (client: QueryClient): SessionInfo[] =>
  (
    client.getQueryData<InfiniteData<SessionListOutput>>(listKey)?.pages ?? []
  ).flatMap((page): SessionInfo[] => page.sessions);

describe('applying a live update to the loaded Sessions list', () => {
  it('refreshes ordinary query results while updating infinite rows', () => {
    const client = listWith([session('a', 1)], null);
    const queryKey = [['session', 'list'], { input: {}, type: 'query' }];

    const ordinary: SessionListOutput = {
      sessions: [session('a', 1)],
      nextCursor: null,
    };

    client.setQueryData(queryKey, ordinary);

    const asks = applySessionListUpdate(client, list, {
      type: 'changed',
      session: session('a', 1, { title: 'Renamed' }),
    });

    expect(asks).toBe(true);
    expect(shown(client)[0]?.title).toBe('Renamed');
    expect(client.getQueryData(queryKey)).toBe(ordinary);
  });

  it('replaces a changed row where it sits and asks nothing', () => {
    const client = listWith([session('b', 2), session('a', 1)], null);

    const asks = applySessionListUpdate(client, list, {
      type: 'changed',
      session: session('b', 2, { activity: 'Reading' }),
    });

    expect(asks).toBe(false);
    expect(shown(client).map((row) => [row.sessionId, row.activity])).toEqual([
      ['b', 'Reading'],
      ['a', ''],
    ]);
  });

  it('shows a rename at once without asking', () => {
    const client = listWith([session('a', 1)], null);

    const asks = applySessionListUpdate(client, list, {
      type: 'changed',
      session: session('a', 1, { title: 'Renamed' }),
    });

    expect(asks).toBe(false);
    expect(shown(client)[0]?.title).toBe('Renamed');
  });

  it('asks again for a new Session, an archive, and a removal', () => {
    const client = listWith([session('a', 1)], null, { archived: false });

    const asked = [
      { type: 'changed', session: session('new', 9) },
      { type: 'changed', session: session('a', 1, { archivedAt: 5 }) },
      { type: 'removed', sessionId: 'a' },
    ] as const;

    expect(
      asked.map((update) => applySessionListUpdate(client, list, update)),
    ).toEqual([true, true, true]);
  });

  it('asks nothing for a row older than the last loaded page', () => {
    const client = listWith([session('b', 20), session('a', 10)], 'more');

    expect(
      applySessionListUpdate(client, list, {
        type: 'changed',
        session: session('old', 3),
      }),
    ).toBe(false);
  });
});
