import type { SessionNotification } from '@agentclientprotocol/sdk';
import { feedRow, session } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { expect, it, vi } from 'vitest';
import { openMemorySubagents } from '#mocks/memory-subagents';
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
