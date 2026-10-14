import type { SessionUpdate } from '@repo/contracts';
import { feedRow, turn } from '@repo/db/schema';
import type { AgentIdentity } from '@repo/mocks/agent';
import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { expect, it, onTestFinished, vi } from 'vitest';
import {
  insertEndedTurn,
  insertSession,
  openTestDatabase,
} from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { scriptedEngineInput } from '#mocks/scripted-engine';

type MalformedFeedCase = {
  agent: AgentIdentity['agent'];
  kind: Extract<
    SessionUpdate['sessionUpdate'],
    'agent_message' | 'agent_thought' | 'plan_update'
  >;
};

it.each(
  fixtureAgents.flatMap(({ agent }): MalformedFeedCase[] =>
    (['agent_message', 'plan_update', 'agent_thought'] as const).map(
      (kind): MalformedFeedCase => ({ agent, kind }),
    ),
  ),
)(
  'degrades only the Session with a malformed $kind row for $agent',
  async ({ agent, kind }): Promise<void> => {
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
      .values([
        {
          sessionId: 'healthy',
          id: 'reply',
          position: 0,
          revision: 1,
          state: 'settled',
          sessionUpdate: 'agent_message',
          payloadVersion: 1,
          payload: {
            messageId: 'reply',
            content: [{ type: 'text', text: 'Healthy reply' }],
          },
        },
        {
          sessionId: 'session-1',
          id: 'bad',
          turnId: 'running',
          position: 0,
          revision: 1,
          state: 'settled',
          sessionUpdate: kind,
          payloadVersion: 1,
          payload: { messageId: 'bad', content: 'invalid', plan: 'invalid' },
        },
      ])
      .run();
    const result = await caller.session.list({ archived: false });
    expect(result.sessions).toHaveLength(2);
    expect(
      result.sessions.find((row): boolean => row.sessionId === 'session-1'),
    ).toMatchObject({ activity: '', plan: null });
    expect(
      result.sessions.find((row): boolean => row.sessionId === 'healthy'),
    ).toMatchObject({ activity: 'Healthy reply' });
    expect(
      reported.mock.calls.some(([message]): boolean =>
        String(message).includes('rejected'),
      ),
    ).toBe(true);
  },
);
