import type { FeedUpdate } from '@repo/contracts';
import { queuedNoticeJob, readQueuedFeed } from '../feed';
import { AtomicWriterJob, type WriterJob } from '../storage';
import type { Schedule } from './schedule-store';
import type { SessionHandlerSources } from './session-sources';
import type { AnnouncedJob, WriterChange } from './writer-changes';

export interface ScheduleOccurrence {
  sessionId: string;
  prompt: Schedule['prompt'];
  at: number;
  timeZone?: string;
  // Due longer ago than the grace window: skipped once, never sent.
  late: boolean;
  deliveryWrite: WriterJob;
  coalescedWrite: WriterJob;
  skipWrite: WriterJob;
}

type Skip = Pick<ScheduleOccurrence, 'sessionId' | 'at' | 'timeZone'> & {
  scheduleId: string;
  reason: 'offline' | 'waiting';
  advance: WriterJob;
};

export async function recordScheduleSkip(
  sources: NoticeSources,
  { sessionId, at, timeZone, scheduleId, reason, advance }: Skip,
): Promise<void> {
  const notice = {
    id: `${scheduleId}:skipped:${at}`,
    sessionUpdate: 'notice',
    state: 'settled',
    severity: 'info',
    title: 'Skipped Schedule occurrence',
    _meta: { argo: { skippedSchedule: { at, reason, timeZone } } },
  } satisfies Extract<FeedUpdate, { sessionUpdate: 'notice' }>;

  await writeScheduleNotice(sources, { sessionId, notice, advance });
}

type NoticeSources = Pick<
  SessionHandlerSources,
  'database' | 'findFeed' | 'findWriter' | 'readSession' | 'open'
>;

type NoticeWrite = {
  sessionId: string;
  notice: Extract<FeedUpdate, { sessionUpdate: 'notice' }>;
  advance: WriterJob;
};

export async function writeScheduleNotice(
  sources: NoticeSources,
  { sessionId, notice, advance }: NoticeWrite,
): Promise<void> {
  const feed = sources.findFeed(sessionId);

  if (feed) {
    const committed = Promise.withResolvers<void>();
    feed.send({
      type: 'feed.change',
      turnId: null,
      change: { type: 'upsert', update: notice },
      commitWith: advance,
      committed,
    });

    return committed.promise;
  }

  const queued = readQueuedFeed(sources.findWriter(), sessionId);
  const { maxRevision } = sources.readSession(sessionId);

  const feedWrite = queuedNoticeJob(sources.database, {
    sessionId,
    notice,
    queued,
    maxRevision,
  });

  await sources.open.write(new AtomicWriterJob([feedWrite, advance]));
}

export function announceScheduleWrite(
  sessionId: string,
  job: WriterJob,
): WriterJob & AnnouncedJob {
  return {
    ...job,
    announcedChange: (): WriterChange => ({
      sessionIds: [sessionId],
      turnIds: [],
    }),
  };
}

export type NoticeWriter = (write: WriterJob) => Promise<void>;
