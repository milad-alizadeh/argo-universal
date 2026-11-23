import type { WriterJob } from '../storage';
import { writeScheduleNotice } from './schedule-skip';
import type { SessionHandlerSources } from './session-sources';

export const scheduleCreatedNoticeSuffix = ':schedule-created';

export function scheduleCreatedNotice(
  sources: SessionHandlerSources,
  created: { sessionId: string; instructions: string },
): (advance: WriterJob) => Promise<void> {
  const { sessionId, instructions } = created;

  return (advance) =>
    writeScheduleNotice(sources, {
      sessionId,
      advance,
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
