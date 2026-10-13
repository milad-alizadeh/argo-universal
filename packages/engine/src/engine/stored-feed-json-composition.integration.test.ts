import { agentAdapters } from '@repo/agents';
import { feedRow, turn } from '@repo/db/schema';
import { sql } from 'drizzle-orm';
import { expect, it, onTestFinished, vi } from 'vitest';
import {
  insertEndedTurn,
  insertSession,
  openTestDatabase,
} from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { scriptedEngineInput } from '#mocks/scripted-engine';

type FeedColumnCase = {
  agent: string;
  kind: 'agent_message' | 'agent_thought' | 'tool_call_update';
  field: string;
  column: typeof feedRow.payload | typeof feedRow.sourceRef;
};

it.each(
  agentAdapters.flatMap(({ agent }): FeedColumnCase[] =>
    (['agent_message', 'agent_thought', 'tool_call_update'] as const).flatMap(
      (kind): FeedColumnCase[] => [
        { agent, kind, column: feedRow.payload, field: 'payload' },
        { agent, kind, column: feedRow.sourceRef, field: 'source reference' },
      ],
    ),
  ),
)(
  'degrades only the Session with unreadable $kind $field JSON for $agent',
  async ({ agent, kind, column }): Promise<void> => {
    const { database, remove } = openTestDatabase({ agent });
    insertEndedTurn(database);
    onTestFinished(remove);
    const reported = vi
      .spyOn(console, 'error')
      .mockImplementation((): void => {});
    onTestFinished((): void => reported.mockRestore());
    const { createCaller } = await startEngineTestHost({
      database,
      ...scriptedEngineInput({ steps: [] }, agent),
    });
    const caller = createCaller();
    insertSession(database, { id: 'healthy', agent });
    insertEndedTurn(database, 'healthy');
    database
      .insert(turn)
      .values({ id: 'running', sessionId: 'session-1', status: 'running' })
      .run();
    database
      .insert(feedRow)
      .values({
        sessionId: 'session-1',
        id: 'bad',
        position: 0,
        revision: 1,
        turnId: 'running',
        state: 'settled',
        sessionUpdate: kind,
        payloadVersion: 1,
        payload: {
          messageId: 'bad',
          content: [{ type: 'text', text: 'A stored reply' }],
          toolCallId: 'bad',
          title: 'Read a file',
          status: 'in_progress',
          kind: 'read',
        },
      })
      .run();
    database.run(
      sql`update ${feedRow} set ${sql.identifier(column.name)} = 'broken-json' where ${feedRow.id} = 'bad'`,
    );
    const result = await caller.session.list({ archived: false });
    expect(result.sessions).toHaveLength(2);
    expect(
      result.sessions.find((row): boolean => row.sessionId === 'session-1'),
    ).toMatchObject({ activity: '', plan: null });
    expect(result.sessions.map((row): string => row.sessionId)).toContain(
      'healthy',
    );
    expect(
      reported.mock.calls.some(([message]): boolean =>
        String(message).includes('rejected'),
      ),
    ).toBe(true);
    await expect(
      caller.feed.page({
        sessionId: 'session-1',
        direction: 'tail',
        limit: 50,
      }),
    ).rejects.toThrow("Unexpected token 'b'");
  },
);
