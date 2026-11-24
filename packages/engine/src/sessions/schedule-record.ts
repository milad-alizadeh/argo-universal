import { sessionSchedule as table } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import type { WriterJob } from '../storage';
import { announceScheduleWrite } from './schedule-skip';
import type { ScheduleRow } from './schedule-store';

type OccurrenceRecord = Partial<
  Pick<ScheduleRow, 'nextAt' | 'lastQueuedAt' | 'lastSkippedAt'>
>;

// Records an occurrence on a Schedule, announced to the Session it belongs to.
export const recordWrite = (
  { id, sessionId }: Pick<ScheduleRow, 'id' | 'sessionId'>,
  record: OccurrenceRecord,
): WriterJob =>
  announceScheduleWrite(sessionId, {
    describe: () => 'Record scheduled Prompt',
    commit: (tx) => {
      tx.update(table).set(record).where(eq(table.id, id)).run();
    },
  });
