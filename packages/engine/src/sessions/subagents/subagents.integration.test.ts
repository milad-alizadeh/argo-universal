import type { AnyMessage, SessionNotification } from '@agentclientprotocol/sdk';
import { feedRow, session } from '@repo/db/schema';
import { createRejectionCounter } from '@repo/machine-log';
import { eq } from 'drizzle-orm';
import { expect, it, vi } from 'vitest';
import { openMemorySubagents } from '#mocks/memory-subagents';
import { createDraftSubagentTranslator } from '../../agents/acp/connection/draft-subagent-updates';
import { createSessionSnapshotWatcher } from '../snapshot';
import { ownsSubagentUpdate } from '.';

const vendorChild = 'vendor-child';

const association: SessionNotification = {
  sessionId: 'acp-session',
  update: {
    sessionUpdate: 'subagent_update',
    sessionId: vendorChild,
    state: { state: 'running' },
  },
};

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

it('keeps an explicitly reported Claude Agent role through partial updates and reload', async (): Promise<void> => {
  const { database, route, settled } = openMemorySubagents();
  const snapshot = (): string | null | undefined => {
    let role: string | null | undefined;
    const watch = createSessionSnapshotWatcher({
      database,
      findFeed: () => undefined,
      findWriter: () => undefined,
      findSession: () => undefined,
    });
    const subscription = watch('session-1', {
      next: (event) => {
        if (event.type === 'snapshot') role = event.snapshot.subagents[0]?.role;
      },
    });
    subscription.unsubscribe();
    return role;
  };

  route({
    ...association,
    update: {
      ...association.update,
      _meta: { claudeCode: { subagentRole: 'Explore' } },
    },
  });
  route(association);
  route({
    ...association,
    update: {
      ...association.update,
      _meta: { claudeCode: { subagentRole: '  custom-role  ' } },
    },
  });
  route(association);
  await settled();
  expect(snapshot()).toBe('  custom-role  ');
});

it('preserves role metadata on a draft spawn through to the reloaded Session snapshot', async (): Promise<void> => {
  const { database, route, settled } = openMemorySubagents();
  const translate = createDraftSubagentTranslator(
    createRejectionCounter('test'),
  );
  const draft: AnyMessage = {
    jsonrpc: '2.0',
    method: 'session/update',
    params: {
      sessionId: 'acp-session',
      update: {
        sessionUpdate: 'subagent_spawned',
        subagentSessionId: vendorChild,
        _meta: { claudeCode: { subagentRole: 'Plan' } },
      },
    },
  };
  for (const message of translate(draft)) {
    if (
      'params' in message &&
      typeof message.params === 'object' &&
      message.params !== null &&
      'update' in message.params
    )
      route(message.params as SessionNotification);
  }
  await settled();
  let role: string | null | undefined;
  const watch = createSessionSnapshotWatcher({
    database,
    findFeed: () => undefined,
    findWriter: () => undefined,
    findSession: () => undefined,
  });
  const subscription = watch('session-1', {
    next: (event) => {
      if (event.type === 'snapshot') role = event.snapshot.subagents[0]?.role;
    },
  });
  subscription.unsubscribe();
  expect(role).toBe('Plan');
});
