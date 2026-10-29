import type { SessionConfigOption } from '@repo/contracts';
import { turn as turnTable } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { writeJobs } from '../../storage';
import { sessionTurn } from '.';

export const turnId = 'turn-1';

export type TurnStep = ReturnType<typeof sessionTurn.start>;

type StartContext = Parameters<typeof sessionTurn.start>[0];

type EndContext = Parameters<typeof sessionTurn.end>[0];

const model: SessionConfigOption = {
  type: 'select',
  configId: 'model',
  category: 'model',
  name: 'Model',
  currentValue: 'opus',
  options: [{ value: 'opus', name: 'Opus' }],
};

export const startContext: StartContext = {
  sessionId: 'session-1',
  configOptions: [model],
  input: { now: () => 100 },
};

export const endContext = (
  overrides: Partial<EndContext> = {},
): EndContext => ({
  activeTurnId: turnId,
  activeTurnStartedAt: 100,
  feedEnded: false,
  storageFailedTurn: false,
  input: { now: () => 175 },
  ...overrides,
});

type TurnStore = {
  // What the Session does with a step: its writes, and the commit the Feed adds when it completes a Turn.
  commit: (step: TurnStep) => void;
  storedTurn: () => typeof turnTable.$inferSelect | undefined;
};

// A test database holding Session `session-1`, for the length of each test.
export const withTurnStore = (): TurnStore => {
  let database: ReturnType<typeof openTestDatabase>['database'] | undefined;

  let remove: (() => void) | undefined;

  beforeEach((): void => {
    ({ database, remove } = openTestDatabase());
  });

  afterEach((): void => remove?.());

  return {
    commit: (step): void => {
      const committedByFeed = step.feed.flatMap((event) =>
        event.type === 'feed.completeTurn' && event.commitWith
          ? [event.commitWith]
          : [],
      );

      if (database)
        writeJobs(database, [
          ...step.writes.map((write) => write.job),
          ...committedByFeed,
        ]);
    },
    storedTurn: () =>
      database?.select().from(turnTable).where(eq(turnTable.id, turnId)).get(),
  };
};
