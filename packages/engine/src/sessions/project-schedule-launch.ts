import type {
  ProjectSchedule,
  ProjectScheduleOccurrence,
} from '@repo/contracts/operations';
import { startSessionCreation } from './creation/session-creation';
import type { SessionHandlerSources } from './session-sources';

export async function launchScheduledSession(
  sources: SessionHandlerSources,
  {
    id,
    projectId,
    agent,
    checkout,
    configOptions,
    instructions,
  }: ProjectSchedule,
  timing: { at: number; signal?: AbortSignal },
): Promise<ProjectScheduleOccurrence> {
  const { at, signal } = timing;

  try {
    const creation = await startSessionCreation(
      sources,
      {
        projectId,
        agent,
        checkout,
        configOptions,
        prompt: [{ type: 'text', text: instructions }],
      },
      {
        startedBySessionId: null,
        sender: { type: 'schedule', scheduleId: id, title: 'Schedule' },
        signal,
      },
    );

    const { sessionId } = await creation.accepted;

    return { at, outcome: 'started', sessionId };
  } catch (error) {
    return {
      at,
      outcome: 'failed',
      reason:
        error instanceof Error ? error.message : 'Could not start the Session.',
    };
  }
}
