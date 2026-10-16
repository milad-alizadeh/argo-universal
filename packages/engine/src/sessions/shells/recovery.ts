import { ShellRecord } from '@repo/contracts';
import type { Database } from '@repo/db';
import { shell } from '@repo/db/schema';
import { writeBlobFile } from '../../feed';
import {
  clearShellOutputs,
  readRecoveredOutput,
  removeShellOutput,
  shellOutputBlob,
  shellOutputPath,
} from './files';
import { ShellWriteJob } from './storage';

export async function recoverShells(input: {
  database: Database;
  home: string;
  blobsFolder: string;
}): Promise<void> {
  const rows = input.database.select().from(shell).all();

  for (const row of rows) {
    const record = ShellRecord.parse(row);
    const path = shellOutputPath(input.home, record.sessionId, record.id);

    if (record.status === 'running')
      await recoverRunningShell(input, record, path);
    await removeShellOutput(path);
  }

  await clearShellOutputs(input.home);
}

async function recoverRunningShell(
  input: { database: Database; home: string; blobsFolder: string },
  record: ShellRecord,
  path: string,
): Promise<void> {
  const bytes = await readRecoveredOutput(path);
  const metadata = shellOutputBlob(bytes);
  await writeBlobFile(input.blobsFolder, metadata.id, bytes);

  const lost = lostShell(record, metadata.id);
  input.database.transaction((transaction) =>
    new ShellWriteJob(lost, bytes).commit(transaction),
  );
}

const lostShell = (record: ShellRecord, outputBlobId: string): ShellRecord => ({
  ...record,
  status: 'lost',
  exitCode: null,
  endedAt: Date.now(),
  outputBlobId,
});
