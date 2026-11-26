import { AtomicWriterJob, type WriterJob } from '../storage';
import { writeScheduleNotice } from './schedule-skip';
import { seenAtEndJob } from './session-seen';
import type { SessionHandlerSources } from './session-sources';

export const scheduleCreatedNoticeSuffix = ':schedule-created';

// Saving a task Schedule writes this notice seen in the same write, so only a run that ends marks the Session Unread and the badge never counts the save.
export function scheduleCreatedNotice(
  sources: SessionHandlerSources,
  created: { sessionId: string; instructions: string },
): (advance: WriterJob) => Promise<void> {
  const { sessionId, instructions } = created;

  return (advance) =>
    writeScheduleNotice(sources, {
      sessionId,
      advance: new AtomicWriterJob([advance, seenAtEndJob(sessionId)]),
      notice: {
        id: sessionId + scheduleCreatedNoticeSuffix,
        sessionUpdate: 'notice',
        state: 'settled',
        severity: 'info',
        title: 'Schedule created',
        description: instructions,
      },
    });
}
