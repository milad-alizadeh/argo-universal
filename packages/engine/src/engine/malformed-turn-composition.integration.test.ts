import { turn } from '@repo/db/schema';
import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { expect, it, onTestFinished, vi } from 'vitest';
import {
  insertEndedTurn,
  insertSession,
  openTestDatabase,
} from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { scriptedEngineInput } from '#mocks/scripted-engine';

const rejectedSessionListLog = 'sessions: rejected list shape #1';

it.each(fixtureAgents.map(({ agent }): string => agent))(
  'drops only the Session with a malformed Turn for %s',
  async (agent): Promise<void> => {
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
      .values({
        id: 'bad-turn',
        sessionId: 'session-1',
        status: 'ended',
        usage: { totalTokens: 'invalid' },
      })
      .run();
    const result = await caller.session.list({ archived: false });
    expect(result.sessions.map((row): string => row.sessionId)).toEqual([
      'healthy',
    ]);
    expect(reported).toHaveBeenCalledWith(
      rejectedSessionListLog,
      expect.anything(),
    );
  },
);
