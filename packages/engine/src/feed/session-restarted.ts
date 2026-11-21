import type {
  FeedChange,
  SessionRestart,
  SessionUpdate,
} from '@repo/contracts';

export const sessionRestartedEvent = 'feed.sessionRestarted';

// A restart happens between Turns, so its Notice belongs to none.
export type SessionRestartedEvent = {
  type: typeof sessionRestartedEvent;
  turnId: null;
  restart: SessionRestart;
};

export const clearedContextIdPrefix = 'context-cleared:';

export const legacyContextClearedNotice = {
  title: 'Context cleared',
  description: 'The Agent remembers nothing above this point.',
} as const;

const wording = {
  reload: {
    title: 'Agent reloaded',
    description: 'The Agent started again and kept this conversation.',
  },
  clear: { ...legacyContextClearedNotice },
} as const satisfies Record<
  SessionRestart,
  { title: string; description: string }
>;

export const isContextCleared = (row: SessionUpdate): boolean =>
  row.sessionUpdate === 'notice' &&
  row.turnId === null &&
  row.severity === 'info' &&
  (row.id.startsWith(clearedContextIdPrefix) ||
    (row.title === legacyContextClearedNotice.title &&
      row.description === legacyContextClearedNotice.description));

export const sessionRestartedNotice = (
  id: string,
  restart: SessionRestart,
): FeedChange => ({
  type: 'upsert',
  update: {
    id: restart === 'clear' ? `${clearedContextIdPrefix}${id}` : id,
    sessionUpdate: 'notice',
    state: 'settled',
    severity: 'info',
    ...wording[restart],
  },
});
