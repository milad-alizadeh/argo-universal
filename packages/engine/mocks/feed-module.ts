import { join } from 'node:path';
import type { Database } from '@repo/db';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import { type AppRouter, createAppRouter } from '../src/engine/router';
import {
  type AppRouterInput,
  createAppRouterDeps,
  createFeedSources,
} from '../src/engine/router-deps';
import type { FeedActorRef } from '../src/feed';
import { LocalNetworkAccess } from '../src/network-access';
import { Plugins } from '../src/plugins';
import { coreOnlyHooks } from './core-hooks';
import { startEngineTestHost } from './engine';
import { openFeedForModule } from './feed-module-actor';
import { serverDeviceContext } from './rpc-context';
import { scriptedEngineInput } from './scripted-engine';

type FeedModuleOptions = {
  database: Database;
  runtimeDirectory: string;
  scenario?: ScriptedScenario;
  agent?: string;
};

type FeedModuleHost = Awaited<ReturnType<typeof startEngineTestHost>> & {
  feed: FeedActorRef;
  agent: ReturnType<typeof scriptedEngineInput>['agent'];
};

// The exported Feed module accepts FeedChange inputs with real Writer, SQLite and Session snapshots.
export const startFeedModuleTestHost = ({
  database,
  runtimeDirectory,
  scenario = { steps: [] },
  agent = 'mock',
}: FeedModuleOptions): Promise<FeedModuleHost> =>
  buildFeedModule({ database, runtimeDirectory, scenario, agent });

type FeedSetup = Required<FeedModuleOptions>;

const buildFeedModule = async (setup: FeedSetup): Promise<FeedModuleHost> => {
  setFixtureAgent(setup.database, setup.agent);
  const ids = feedIds();
  const input = feedAgent(setup.scenario, setup.agent);
  const host = await startFeedEngine(setup, { createId: ids.engine, input });
  const feed = await openFeedForModule(host, setup.agent, ids.feed);

  return { ...host, feed, agent: input.agent };
};

const setFixtureAgent = (database: Database, agent: string): void => {
  database.$client
    .prepare('UPDATE session SET agent = ? WHERE id = ?')
    .run(agent, 'session-1');
};

const feedAgent = (
  scenario: ScriptedScenario,
  agent: string,
): ReturnType<typeof scriptedEngineInput> =>
  scriptedEngineInput({ ...scenario, sessionIds: ['vendor-1'] }, agent);

const startFeedEngine = (
  storage: Pick<FeedModuleOptions, 'database' | 'runtimeDirectory'>,
  setup: {
    createId: () => string;
    input: ReturnType<typeof scriptedEngineInput>;
  },
): Promise<Awaited<ReturnType<typeof startEngineTestHost>>> =>
  startEngineTestHost({
    database: storage.database,
    runtimeDirectory: storage.runtimeDirectory,
    createId: setup.createId,
    ...setup.input,
  });

type FeedIds = { engine: () => string; feed: () => string };

const feedIds = (): FeedIds => {
  let identity = 0;

  return {
    engine: () => (++identity === 1 ? 'turn-1' : `feed-fixture-${identity}`),
    feed: () => `feed-fixture-${++identity}`,
  };
};

const feedModuleSecrets = {
  controlToken: 'feed-module-test-token',
  serverPublicKey: 'feed-module-test-public-key',
};

const feedModuleRouterInput = (
  host: Awaited<ReturnType<typeof startEngineTestHost>>,
  signal: AbortSignal,
): AppRouterInput => ({
  ...feedModuleSecrets,
  userHome: join(host.home, 'user-home'),
  sessionTokens: host.engine.getSnapshot().context.sessionTokens,
  database: host.database,
  hooks: coreOnlyHooks,
  plugins: feedPlugins(host),
  sessions: host.openSessions,
  databaseWriter: host.databaseWriter,
  notifications: host.notifications,
  ...routerRuntime(host, signal),
});

const feedPlugins = (
  host: Awaited<ReturnType<typeof startEngineTestHost>>,
): AppRouterInput['plugins'] =>
  new Plugins({
    home: host.home,
    version: '1.2.3',
    database: host.database,
    databaseWriter: host.databaseWriter,
    sessions: host.openSessions,
  }).router;

type RouterRuntime = Pick<
  AppRouterInput,
  | 'blobsFolder'
  | 'version'
  | 'startedAt'
  | 'sessionCommandSignal'
  | 'registry'
  | 'localNetworkAccess'
>;

const routerRuntime = (
  host: Awaited<ReturnType<typeof startEngineTestHost>>,
  signal: AbortSignal,
): RouterRuntime => ({
  blobsFolder: host.blobsFolder,
  version: '1.2.3',
  startedAt: '2026-10-03T00:00:00.000Z',
  sessionCommandSignal: signal,
  registry: host.engine.system.get('registry'),
  localNetworkAccess: networkAccessOf(host),
});

// The router reads the module's own feed actor for session-1.
export const createFeedModuleCaller = (
  host: Awaited<ReturnType<typeof startEngineTestHost>>,
  feed: FeedActorRef | undefined,
  signal: AbortSignal,
): ReturnType<AppRouter['createCaller']> => {
  const input = feedModuleRouterInput(host, signal);
  const sources = createFeedSources(input);

  const findFeed = (sessionId: string): FeedActorRef | undefined =>
    sessionId === 'session-1' && feed ? feed : sources.findFeed(sessionId);

  return createAppRouter(
    createAppRouterDeps(input, { ...sources, findFeed }),
  ).createCaller(serverDeviceContext(signal), { signal });
};

const networkAccessOf = (
  host: Awaited<ReturnType<typeof startEngineTestHost>>,
): LocalNetworkAccess =>
  new LocalNetworkAccess(host.database, host.databaseWriter);
