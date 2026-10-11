import { session } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { expect, it, onTestFinished } from 'vitest';
import { startSessionJourney, newSession } from '#mocks/session-journey';

it('rejects a new Session when the writer keeps its insert queued for retry', async (): Promise<void> => {
  const { caller, database } = await startSessionJourney();
  database.$client.exec(
    "CREATE TRIGGER reject_session_insert BEFORE INSERT ON session BEGIN SELECT RAISE(ABORT, 'database is locked'); END",
  );
  onTestFinished((): void =>
    database.$client.exec('DROP TRIGGER reject_session_insert'),
  );
  await expect(caller.session.new(newSession)).rejects.toMatchObject({
    code: 'INTERNAL_SERVER_ERROR',
    message: expect.stringContaining(
      'was not stored because the writer is retrying. Retry the Session.',
    ),
  });
});

it('rejects a new Session whose insert is queued behind another retrying job', async (): Promise<void> => {
  const { caller, database } = await startSessionJourney(['small', 'large']);
  await caller.session.setConfigOption({
    sessionId: 'session-1',
    configId: 'model',
    type: 'id',
    value: 'small',
  });
  await expect
    .poll(
      () =>
        database.select().from(session).where(eq(session.id, 'session-1')).get()
          ?.configValues,
    )
    .toEqual([{ configId: 'model', value: 'small' }]);
  const rejectedUpdate = Promise.withResolvers<void>();
  database.$client.function('record_rejected_update', () => {
    rejectedUpdate.resolve();
    return 0;
  });
  database.$client.exec(
    "CREATE TRIGGER reject_session_update BEFORE UPDATE ON session BEGIN SELECT record_rejected_update(); SELECT RAISE(ABORT, 'another job cannot be written'); END",
  );
  onTestFinished((): void =>
    database.$client.exec('DROP TRIGGER reject_session_update'),
  );
  await caller.session.setConfigOption({
    sessionId: 'session-1',
    configId: 'model',
    type: 'id',
    value: 'large',
  });
  await rejectedUpdate.promise;
  expect(
    database.select().from(session).where(eq(session.id, 'session-1')).get()
      ?.configValues,
  ).toEqual([{ configId: 'model', value: 'small' }]);
  await expect(caller.session.new(newSession)).rejects.toMatchObject({
    code: 'INTERNAL_SERVER_ERROR',
    message: expect.stringContaining(
      'was not stored because the writer is retrying. Retry the Session.',
    ),
  });
});
