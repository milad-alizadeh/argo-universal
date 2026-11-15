import type { SessionRestart } from '@repo/contracts';
import { sessionRestartedEvent, type FeedEvent } from '../../feed';
import type { SessionContext, SessionWrite } from '../session-context';
import { SessionRowUpdateJob } from '../session-storage';

// What a restart does to the Session before it closes: a change and its writes, then the Notice for its Feed.
export type RestartStep = {
  change?: Partial<SessionContext>;
  writes: SessionWrite[];
  notice: FeedEvent;
};

// With no Agent session id, the next open asks the Agent for a new Agent session.
const forgottenAgentSession = (
  context: SessionContext,
): Pick<RestartStep, 'change' | 'writes'> => ({
  change: { vendorSessionId: null },
  writes: [
    {
      job: new SessionRowUpdateJob({
        id: context.sessionId,
        set: { vendorSessionId: null },
      }),
    },
  ],
});

// A reload keeps the Agent session, so only a clear changes the Session.
export const restartStep = (
  context: SessionContext,
  restart: SessionRestart,
): RestartStep => ({
  ...(restart === 'clear' ? forgottenAgentSession(context) : { writes: [] }),
  notice: { type: sessionRestartedEvent, turnId: null, restart },
});
