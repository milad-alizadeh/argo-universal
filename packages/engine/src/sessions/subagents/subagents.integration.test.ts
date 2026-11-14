import type { SessionNotification } from '@agentclientprotocol/sdk';
import { feedRow, session } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { expect, it, vi } from 'vitest';
import { openMemorySubagents } from '#mocks/memory-subagents';
import { createSessionSnapshotWatcher } from '../snapshot';
import { ownsSubagentUpdate } from '.';

const vendorChild = 'vendor-child';

const acpSessionId = 'acp-session';

const association: SessionNotification = {
  sessionId: acpSessionId,
  update: {
    sessionUpdate: 'subagent_update',
    sessionId: vendorChild,
    state: { state: 'running' },
  },
};

const withDescription = (description: string): SessionNotification => ({
  ...association,
  update: {
    sessionUpdate: 'subagent_update',
    sessionId: vendorChild,
    state: { state: 'running' },
    description,
  },
});

const message: SessionNotification = {
  sessionId: vendorChild,
  update: {
    sessionUpdate: 'agent_message_chunk',
    content: { type: 'text', text: 'Reviewing' },
  },
};

it('fails loudly instead of dropping a Subagent update when the Session has no Feed', (): void => {
  const { withoutFeed } = openMemorySubagents();

  expect(() => withoutFeed(association)).toThrow(
    'Session session-1 has no Feed to route a Subagent update to',
  );
});

it('opens a child Session and a Feed row for a Subagent the Agent names', async (): Promise<void> => {
  const { database, route, flush } = openMemorySubagents();

  route(association);
  flush();

  await vi.waitFor(() => {
    expect(
      database
        .select()
        .from(session)
        .where(eq(session.vendorSessionId, vendorChild))
        .get(),
    ).toMatchObject({ parentSessionId: 'session-1' });
    expect(
      database
        .select()
        .from(feedRow)
        .where(eq(feedRow.sessionId, 'session-1'))
        .all(),
    ).toHaveLength(1);
  });
});

it('owns the updates of a Subagent it knows and nothing else', (): void => {
  const { route, state } = openMemorySubagents();

  expect(ownsSubagentUpdate(state(), message)).toBe(false);
  expect(ownsSubagentUpdate(state(), association)).toBe(true);
  route(association);
  expect(ownsSubagentUpdate(state(), message)).toBe(true);
});

it('keeps the role a standard description reports through partial updates and reload', async (): Promise<void> => {
  const { database, route, settled } = openMemorySubagents();

  const snapshot = (): string | null | undefined => {
    let role: string | null | undefined;

    const watch = createSessionSnapshotWatcher({
      database,
      findFeed: vi.fn<() => undefined>(),
      findWriter: vi.fn<() => undefined>(),
      findSession: vi.fn<() => undefined>(),
    });

    const subscription = watch('session-1', {
      next: (event) => {
        if (event.type === 'snapshot') role = event.snapshot.subagents[0]?.role;
      },
    });

    subscription.unsubscribe();

    return role;
  };

  route(withDescription('Explore'));
  route(association);

  route(withDescription('  custom-role  '));
  route(association);
  await settled();

  expect(snapshot()).toBe('  custom-role  ');
});

const spawnOf = (vendorId: string): SessionNotification => ({
  sessionId: acpSessionId,
  update: {
    sessionUpdate: 'subagent_update',
    sessionId: vendorId,
    state: { state: 'running' },
  },
});

const reportedSpawnOf = (
  vendorId: string,
  description: string,
): SessionNotification => ({
  sessionId: acpSessionId,
  update: {
    sessionUpdate: 'subagent_update',
    sessionId: vendorId,
    state: { state: 'running' },
    description,
  },
});

const roleSnapshot = (
  database: ReturnType<typeof openMemorySubagents>['database'],
): (string | null)[] => {
  let roles: (string | null)[] = [];

  const watch = createSessionSnapshotWatcher({
    database,
    findFeed: vi.fn<() => undefined>(),
    findWriter: vi.fn<() => undefined>(),
    findSession: vi.fn<() => undefined>(),
  });

  watch('session-1', {
    next: (event) => {
      if (event.type === 'snapshot')
        roles = event.snapshot.subagents.map((subagent) => subagent.role);
    },
  }).unsubscribe();

  return roles;
};

it('gives each spawned Subagent the next role its Session declared, over any role the Agent reports', async (): Promise<void> => {
  const { database, declare, route, settled } = openMemorySubagents();

  declare('review');
  declare('test');
  route(reportedSpawnOf('first', 'general-purpose'));
  route(spawnOf('second'));
  route(reportedSpawnOf('third', 'Explore'));
  route(reportedSpawnOf('first', 'general-purpose'));
  await settled();

  expect(roleSnapshot(database)).toEqual(['review', 'test', 'Explore']);
});
