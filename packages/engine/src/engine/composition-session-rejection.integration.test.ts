import { agentAdapters } from '@repo/agents';
import { session } from '@repo/db/schema';
import { eq, sql } from 'drizzle-orm';
import { expect, it, onTestFinished, vi } from 'vitest';
import { insertSession, openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { scriptedEngineInput } from '#mocks/scripted-engine';

const rejectedSessionListLog = 'sessions: rejected list shape #1';

it.each(agentAdapters.map(({ agent }): string => agent))(
  'drops only a malformed Session for %s',
  async (agent): Promise<void> => {
    const { database, remove } = openTestDatabase({ agent });
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
    database
      .update(session)
      .set({ titleSource: sql`'invalid'` })
      .where(eq(session.id, 'session-1'))
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
