import type { UsageLimitsSubject, SessionSnapshot } from '@repo/contracts';
import { useUsageLimits } from '#features/agents';
import { useSessionFeed } from '#features/feed';
import { useConnectionDropped, useSchedules } from '#features/sessions';
import type { SessionDetailViewSources } from './session-detail-view-props';
import {
  useSessionCommands,
  type SessionCommands,
} from './use-session-commands';

// A Session's Usage limits are its Agent's, kept for the Agent and Project.
const usageLimitsSubject = (
  snapshot: SessionSnapshot | null | undefined,
): UsageLimitsSubject | undefined =>
  snapshot
    ? { agent: snapshot.agent, projectId: snapshot.projectId }
    : undefined;

export interface ConnectedFeed {
  schedules: ReturnType<typeof useSchedules>;
  feed: ReturnType<typeof useSessionFeed>;
  // The Connection dropped the Feed's open: a toast says why, not a callout.
  feedDropped: boolean;
  commands: SessionCommands;
  usageLimits: SessionDetailViewSources['usageLimits'];
}

export function useConnectedFeed(
  sessionId: string,
  shown: boolean,
): ConnectedFeed {
  const feed = useSessionFeed(sessionId, undefined, shown);

  const schedules = useSchedules(
    sessionId,
    shown,
    feed.snapshot?.archivedAt === null,
  );

  return {
    feed,
    schedules,
    feedDropped: useConnectionDropped(feed.openError),
    usageLimits: useUsageLimits(usageLimitsSubject(feed.snapshot)),
    commands: useFeedCommands(sessionId, feed),
  };
}

function useFeedCommands(
  sessionId: string,
  feed: ConnectedFeed['feed'],
): SessionCommands {
  return useSessionCommands({
    sessionId,
    resumeAfterCommand: feed.resumeAfterCommand,
    agent: feed.snapshot?.agent,
  });
}
