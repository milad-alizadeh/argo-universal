import type {
  FeedChange,
  FeedSubscribeOutput,
  FeedSyncPoint,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import { afterEach, beforeEach, onTestFinished, vi } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { storedMessage as message } from '#mocks/feed';
import {
  createFeedModuleCaller,
  startFeedModuleTestHost,
} from '#mocks/feed-module';
import { scriptedEngineInput } from '#mocks/scripted-engine';
import { FeedRowsJob } from '../src/feed';
import type { FeedActorRef } from '../src/feed/index';
import { writeJobs } from '../src/storage';

export let database: Database;

export let runtimeDirectory: string;

let removeDatabase: () => void;

export let feedTestHost: Awaited<ReturnType<typeof startEngineTestHost>>;

export let controller: AbortController;

export let scriptedAgent: ReturnType<typeof scriptedEngineInput>['agent'];

export let appliedFeed: FeedActorRef | undefined;

export const startFeedTestHost = async (
  scenario: ScriptedScenario = { steps: [] },
  agent = 'mock',
): Promise<void> => {
  const moduleHost = await startFeedModuleTestHost({
    database,
    runtimeDirectory,
    scenario,
    agent,
  });

  feedTestHost = moduleHost;
  scriptedAgent = moduleHost.agent;
  appliedFeed = moduleHost.feed;
};

export const createFeedRouterCaller = (): ReturnType<
  typeof createFeedModuleCaller
> => createFeedModuleCaller(feedTestHost, appliedFeed, controller.signal);

export const applyFeedChange = (change: FeedChange): void => {
  if (!appliedFeed) throw new Error('Feed module is not started');
  appliedFeed.send({
    type: 'feed.change',
    change,
    turnId: runningTurnId(),
  });
};

export const subscribe = async (
  after: FeedSyncPoint | null,
  sessionId = 'session-1',
): Promise<AsyncIterator<FeedSubscribeOutput, void>> =>
  (await createFeedRouterCaller().feed.subscribe({ sessionId, after }))[
    Symbol.asyncIterator
  ]();

export const longHistoryRows = 450;

export const longHistoryPositions = Array.from(
  { length: longHistoryRows },
  (_, position): number => position,
);

export const storeLongHistory = (): void =>
  writeJobs(database, [
    new FeedRowsJob({
      sessionId: 'session-1',
      rows: longHistoryPositions
        .slice(5)
        .map((position): ReturnType<typeof message> => message(position)),
      maxRevision: longHistoryRows,
    }),
  ]);

const runningTurnId = (): string | null => {
  const turn = database.$client
    .prepare('SELECT id FROM turn WHERE session_id = ? AND status = ?')
    .get('session-1', 'running');

  return typeof turn?.id === 'string' ? turn.id : null;
};

const seedHistory = (): void => {
  writeJobs(database, [
    new FeedRowsJob({
      sessionId: 'session-1',
      rows: [0, 1, 2, 3, 4].map((position) => message(position)),
      maxRevision: 5,
    }),
  ]);
};

beforeEach((): void => {
  vi.useFakeTimers();
  appliedFeed = undefined;
  controller = new AbortController();
  ({
    database,
    directory: runtimeDirectory,
    remove: removeDatabase,
  } = openTestDatabase({ epoch: 3 }));
  seedHistory();
  onTestFinished(removeDatabase);
});

afterEach(async (): Promise<void> => {
  controller.abort();
  database.$client.exec('DROP TRIGGER IF EXISTS hold_feed_writes');
  appliedFeed?.send({ type: 'feed.flush' });

  if (vi.isFakeTimers()) await vi.advanceTimersByTimeAsync(0);
  vi.useRealTimers();
});

export const setFeedTestHost = (host: typeof feedTestHost): void => {
  feedTestHost = host;
};

export const setScriptedAgent = (agent: typeof scriptedAgent): void => {
  scriptedAgent = agent;
};
