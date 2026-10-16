import { type FeedSubscribeOutput, SessionOpenFailure } from '@repo/contracts';

type FeedClosed = Extract<FeedSubscribeOutput, { type: 'closed' }>;

// Why the Server closed a Session's Feed: the Agent's own open failure, or the Server's reason as a launch failure; a quiet close is none.
export function closedFeedError(event: FeedClosed): SessionOpenFailure | null {
  if (event.openError) return new SessionOpenFailure(event.openError);

  return event.failure === null
    ? null
    : new SessionOpenFailure({ type: 'failed', message: event.failure });
}
