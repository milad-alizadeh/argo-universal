import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { writeDatabaseJobAndWaitForCommit } from '../feed';

it('keeps Blob upload pending through a shared Writer retry and returns only committed metadata', async () => {
  const { caller, database, databaseWriter } = await startEngineTestHost();
  let attempts = 0;
  database.$client.function('count_rejected_write', () => {
    attempts += 1;
    return 0;
  });
  database.$client.exec(
    "CREATE TRIGGER reject_session BEFORE UPDATE ON session BEGIN SELECT count_rejected_write(); SELECT RAISE(ABORT, 'Session write failed'); END",
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
  let completed = false;
  const upload = caller.blob.upload(form).then((result) => {
    completed = true;
    return result;
  });
  await expect.poll(() => attempts, { timeout: 2000 }).toBeGreaterThan(1);
  expect(database.$client.prepare('SELECT id FROM blob').all()).toEqual([]);
  expect(completed).toBe(false);
  database.$client.exec('DROP TRIGGER reject_session');
  const result = await upload;
  expect(database.$client.prepare('SELECT id FROM blob').all()).toEqual([
    { id: result.blobId },
  ]);
});
