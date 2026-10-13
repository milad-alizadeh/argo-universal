import { agentAdapters } from '@repo/agents';
import { session, turn } from '@repo/db/schema';
import { sql } from 'drizzle-orm';
import { expect, it, onTestFinished, vi } from 'vitest';
import {
  insertEndedTurn,
  insertSession,
  openTestDatabase,
} from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { scriptedEngineInput } from '#mocks/scripted-engine';

const rejectedSessionListLog = 'sessions: rejected list shape #1';

type StoredColumnCase<Table, Column> = {
  agent: string;
  table: Table;
  column: Column;
  id: string;
  field: string;
};
type StoredColumnCases = [
  StoredColumnCase<typeof session, typeof session.configValues>,
  StoredColumnCase<typeof session, typeof session.vendorRef>,
  StoredColumnCase<typeof turn, typeof turn.usage>,
  StoredColumnCase<typeof turn, typeof turn.error>,
];
it.each(
  agentAdapters.flatMap(({ agent }): StoredColumnCases => [
    {
      agent,
      table: session,
      column: session.configValues,
      id: 'session-1',
      field: 'Session config values',
    },
    {
      agent,
      table: session,
      column: session.vendorRef,
      id: 'session-1',
      field: 'Session vendor reference',
    },
    {
      agent,
      table: turn,
      column: turn.usage,
      id: 'bad-turn',
      field: 'Turn usage',
    },
    {
      agent,
      table: turn,
      column: turn.error,
      id: 'bad-turn',
      field: 'Turn error',
    },
  ]),
)(
  'drops only the Session with unreadable $field JSON for $agent',
  async ({ agent, table, column, id }): Promise<void> => {
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
      .values({ id: 'bad-turn', sessionId: 'session-1', status: 'ended' })
      .run();
    database.run(
      sql`update ${table} set ${sql.identifier(column.name)} = 'broken-json' where ${table.id} = ${id}`,
    );
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
