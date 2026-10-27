import { ShellRecord } from '@repo/contracts';
import type { Database } from '@repo/db';
import { shell } from '@repo/db/schema';
import {
  clearShellOutputs,
  ensureRecoveredOutput,
  removeShellOutput,
  shellOutputPath,
} from './files';
import { shellOutputBlob } from './output-blob';
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
  await ensureRecoveredOutput(path);
  const output = await shellOutputBlob(path);
  const job = new ShellWriteJob(lostShell(record, output.metadata.id), output);
  await job.writeFiles(input.blobsFolder);
  input.database.transaction((transaction) => job.commit(transaction));
}

const lostShell = (record: ShellRecord, outputBlobId: string): ShellRecord => ({
  ...record,
  status: 'lost',
  exitCode: null,
  endedAt: Date.now(),
  outputBlobId,
});
