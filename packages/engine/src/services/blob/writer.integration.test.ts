import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { writeDatabaseJobAndWaitForCommit } from '../feed';

it('reports Blob storage failure through the shared Writer while Session row writes retry', async (): Promise<void> => {
  const { caller, database, databaseWriter } = await startEngineTestHost();
  database.$client.exec(
    "CREATE TRIGGER reject_session BEFORE UPDATE ON session BEGIN SELECT RAISE(ABORT, 'Session write failed'); END",
  );
  await expect(
    writeDatabaseJobAndWaitForCommit(databaseWriter, {
      type: 'sessionRowUpdate',
      id: 'session-1',
      set: { title: 'Retried Session' },
    }),
  ).rejects.toThrow('Failed query');
  const form = new FormData();
  form.set('file', new Blob(['attachment']), 'attachment.txt');
  await expect(caller.blob.upload(form)).rejects.toThrow(
    'Writer cannot commit',
  );
  expect(database.$client.prepare('SELECT id FROM blob').all()).toEqual([]);
  database.$client.exec('DROP TRIGGER reject_session');
});
