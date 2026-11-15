import type { FeedChange, SessionRestart } from '@repo/contracts';

export const sessionRestartedEvent = 'feed.sessionRestarted';

// A restart happens between Turns, so its Notice belongs to none.
export type SessionRestartedEvent = {
  type: typeof sessionRestartedEvent;
  turnId: null;
  restart: SessionRestart;
};

const wording = {
  reload: {
    title: 'Agent reloaded',
    description: 'The Agent started again and kept this conversation.',
  },
  clear: {
    title: 'Context cleared',
    description: 'The Agent remembers nothing above this point.',
  },
} as const satisfies Record<
  SessionRestart,
  { title: string; description: string }
>;

export const sessionRestartedNotice = (
  id: string,
  restart: SessionRestart,
): FeedChange => ({
  type: 'upsert',
  update: {
    id,
    sessionUpdate: 'notice',
    state: 'settled',
    severity: 'info',
    ...wording[restart],
  },
});
