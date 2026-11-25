import { sessionSchedule as table } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import type { WriterJob } from '../storage';
import { announceScheduleWrite } from './schedule-skip';
import type { ScheduleRow } from './schedule-store';

type OccurrenceRecord = Partial<
  Pick<ScheduleRow, 'nextAt' | 'lastQueuedAt' | 'lastSkippedAt'>
>;

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

// Announced by the writer so a watcher of the Session reads a change that no write made, such as a Schedule passing its end time.
export const announceOnly = (sessionId: string): WriterJob =>
  announceScheduleWrite(sessionId, {
    describe: () => 'Announce Schedule expiry',
    commit: () => {},
  });
