import type { Page } from '@playwright/test';
import { attachment } from './attachment-latency.mts';
import { concurrentTurns } from './concurrency-latency.mts';
import type { DiffSize } from './diff-fixture.mts';
import {
  type ElapsedScenario,
  readinessTimeout,
  type ScenarioFactory,
} from './elapsed-scenario.mts';
import { inspectorDiff } from './inspector-latency.mts';
import {
  appLaunchComposer,
  appLaunchList,
  windowReopen,
} from './launch-latency.mts';
import { feedScroll, sessionsScroll } from './page.mts';
import { serverRestart } from './restart-latency.mts';
import { sessionSearch } from './search-latency.mts';
import type { SeededServer } from './seed.mts';
import { touch } from './touch-latency.mts';

type Server = () => SeededServer;

type Factories = Record<string, ScenarioFactory>;

type Make = (page: Page, server: SeededServer) => Promise<ElapsedScenario>;

const bind =
  (make: Make, server: Server): ScenarioFactory =>
  (page: Page): Promise<ElapsedScenario> =>
    make(page, server());

// Fixes the last argument of a scenario that takes one.
const withArg =
  <Arg,>(
    make: (
      page: Page,
      server: SeededServer,
      arg: Arg,
    ) => Promise<ElapsedScenario>,
    arg: Arg,
  ): Make =>
  (page: Page, server: SeededServer): Promise<ElapsedScenario> =>
    make(page, server, arg);

const diffSizes: DiffSize[] = ['small', 'large'];

const diffs = (server: Server): Factories =>
  Object.fromEntries(
    diffSizes.map((size) => [
      `diff-${size}-ready`,
      bind(withArg(inspectorDiff, size), server),
    ]),
  );

// One, two and four Sessions answering at once.
const concurrency = (server: Server): Factories =>
  Object.fromEntries(
    [1, 2, 4].map((count) => [
      `turns-concurrent-${count}-scripted`,
      bind(withArg(concurrentTurns, count), server),
    ]),
  );

const kinds = ['text', 'image'] as const;

const sizes = ['small', 'large'] as const;

const arms = ['preview', 'upload'] as const;

const attachments = (server: Server): Factories =>
  Object.fromEntries(
    kinds.flatMap((kind) =>
      sizes.flatMap((size) =>
        arms.map((arm) => [
          `attachment-${arm}-${kind}-${size}-ready`,
          bind(
            withArg(attachment, { kind, size, arm, timeout: readinessTimeout }),
            server,
          ),
        ]),
      ),
    ),
  );

const lifecycle = (server: Server): Factories =>
  Object.fromEntries([
    ['app-launch-list-ready', bind(appLaunchList, server)],
    ['app-launch-composer-ready', bind(appLaunchComposer, server)],
    ['window-reopen-ready', bind(windowReopen, server)],
    ['server-restart-ready', bind(withArg(serverRestart, 'ready'), server)],
    [
      'server-restart-reconnected',
      bind(withArg(serverRestart, 'reconnected'), server),
    ],
    ['server-restart-usable', bind(withArg(serverRestart, 'usable'), server)],
  ]);

const input = (server: Server): Factories =>
  Object.fromEntries([
    ['sessions-search-ready', bind(sessionSearch, server)],
    ['feed-touch-ready', bind(withArg(touch, feedScroll), server)],
    ['sessions-touch-ready', bind(withArg(touch, sessionsScroll), server)],
  ]);

// The scenarios of PF-01 to PF-03, PF-13, PF-14, PF-20 (touch), PF-21 (diff) and PF-23 (search).
export const caseScenarios = (server: Server): Factories =>
  Object.fromEntries(
    [input, diffs, lifecycle, concurrency, attachments].flatMap((group) =>
      Object.entries(group(server)),
    ),
  );
