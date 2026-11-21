import type { Database } from '@repo/db';
import { run } from '@repo/db/schema';
import { releaseProcessGroup } from '@repo/process/group';
import { eq, inArray } from 'drizzle-orm';
import { ownsGroup } from './run-processes';

// Runs end with the Server, so one still recorded as running was left by a crash: its group is killed and it is lost. Nothing reattaches (ADR-0063).
export async function recoverRuns(input: {
  database: Database;
  now: () => number;
}): Promise<void> {
  const left = input.database
    .select()
    .from(run)
    .where(inArray(run.status, ['starting', 'ready']))
    .all();

  for (const { id, pid } of left) {
    if (pid !== null && ownsGroup(pid, id)) await releaseProcessGroup(pid);
    input.database
      .update(run)
      .set({ status: 'lost', exitCode: null, endedAt: input.now() })
      .where(eq(run.id, id))
      .run();
  }
}
