import type { Database } from '@repo/db';
import { run } from '@repo/db/schema';
import {
  commandOfProcessGroupLeader,
  releaseProcessGroup,
} from '@repo/process/group';
import { inArray, isNotNull } from 'drizzle-orm';
import { terminalOwnerToken } from '../lib/terminal-owner';
import {
  removeRunOutput,
  removeSealedRunScratch,
  retainRunOutput,
  runOutputPath,
} from './run-output';
import { type RunRecord, RunWriteJob } from './run-store';
import { recoverShellTerminals } from './shell-terminal-owners';

const ownsRunGroup = (pid: number, id: string): boolean =>
  commandOfProcessGroupLeader(pid)?.includes(terminalOwnerToken(id)) === true;

// Runs end with the Server, so one still recorded as running was left by a crash: its group is killed and it is lost. Nothing reattaches (ADR-0063).
type RunRecovery = { database: Database; home: string; now: () => number };

export async function recoverTerminals(input: RunRecovery): Promise<void> {
  await recoverShellTerminals(input.home);
  await recoverRuns(input);
}

export async function recoverRuns(input: RunRecovery): Promise<void> {
  const left = input.database
    .select()
    .from(run)
    .where(inArray(run.status, ['starting', 'ready']))
    .all();

  for (const record of left) await recoverRun(input, record);

  const sealed = input.database
    .select({ id: run.id, outputBlobId: run.outputBlobId })
    .from(run)
    .where(isNotNull(run.outputBlobId))
    .all();

  for (const record of sealed) await removeSealedRunScratch(input.home, record);
}

async function recoverRun(
  input: RunRecovery,
  record: RunRecord,
): Promise<void> {
  const { id, pid } = record;

  if (pid !== null && ownsRunGroup(pid, id)) await releaseProcessGroup(pid);
  const output = await retainRunOutput(input.home, id);

  const lost = new RunWriteJob(
    {
      ...record,
      status: 'lost',
      exitCode: null,
      endedAt: input.now(),
      outputBlobId: output?.id ?? record.outputBlobId,
    },
    undefined,
    output,
  );

  input.database.transaction((transaction) => lost.commit(transaction));

  if (output) await removeRunOutput(runOutputPath(input.home, id));
}
