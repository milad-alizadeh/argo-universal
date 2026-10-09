import { expect, it } from 'vitest';
import { waitFor } from 'xstate';
import { startRouterTestHost } from '#mocks/router';

it('reports Blob storage failure through the shared Writer while Session work retries', async (): Promise<void> => {
  const { caller, context, databaseWriter } = startRouterTestHost();
  context.database.$client.exec("CREATE TRIGGER reject_session BEFORE UPDATE ON session BEGIN SELECT RAISE(ABORT, 'Session write failed'); END");
  databaseWriter.send({ type: 'writer.write', job: { type: 'sessionRowUpdate', id: 'session-1', set: { title: 'Retried Session' } } });
  await waitFor(databaseWriter, (snapshot) => snapshot.matches('waitingToRetry'));
  const form = new FormData();
  form.set('file', new Blob(['attachment']), 'attachment.txt');
  await expect(caller.blob.upload(form)).rejects.toThrow('Writer cannot commit');
  context.database.$client.exec('DROP TRIGGER reject_session');
});
