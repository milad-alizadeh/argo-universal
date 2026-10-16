import { session, shell } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { expect, it, onTestFinished } from 'vitest';
import { insertSession, openTestDatabase } from '#mocks/database';

it('migrates Shells with Session-scoped ids and cascades only the deleted Session', () => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  insertSession(database, { id: 'session-2' });

  const values = {
    id: 'terminal-1',
    toolCallId: 'tool-1',
    command: 'node',
    cwd: '/project',
    status: 'running',
    startedAt: 100,
  } as const;

  database
    .insert(shell)
    .values([
      { ...values, sessionId: 'session-1' },
      { ...values, sessionId: 'session-2' },
    ])
    .run();
  expect(() =>
    database
      .insert(shell)
      .values({ ...values, sessionId: 'session-1' })
      .run(),
  ).toThrow('UNIQUE constraint failed: shell.session_id, shell.id');
  database.delete(session).where(eq(session.id, 'session-1')).run();
  expect(database.select().from(shell).all()).toMatchObject([
    {
      sessionId: 'session-2',
      id: 'terminal-1',
      exitCode: null,
      endedAt: null,
      outputBlobId: null,
    },
  ]);
});
