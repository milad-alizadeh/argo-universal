import {
  currentPluginSurface,
  type PluginSurface,
} from '@repo/contracts/plugins/kit';
import type { PageRun } from '@repo/contracts/plugins/page-address';
import type { DrawRequest } from '@repo/contracts/plugins/page-draw';
import {
  type Asking,
  LoaderPages,
  PluginOperationService,
  type PluginRuntime,
  type PluginService,
} from '@repo/engine/plugins';
import { PageView } from './page-view';
import type { PluginTest } from './test-types';

type Operations = PluginTest['operations'];

type Hosted = { service: PluginService; runtime: PluginRuntime };

type RunInput = Parameters<Operations['run']>[0];

type Platform = PluginSurface['platform'];

type Run = Parameters<PluginOperationService['run']>[0];

/*
 * One run of one of the Plugin's own Operations, as an Agent's `argo run` would (ADR-0044). The test
 * names the Operation; its Plugin, params and caller default to the Plugin under test and no Session.
 */
export function testOperations(
  { service, runtime }: Hosted,
  pluginId: string,
): Operations {
  const operations = new PluginOperationService(service, runtime.operations);

  return {
    list: () => operations.rows(),
    run: (input) => operations.run(runInput(input, pluginId)),
  };
}

// A draw asks as the platform's App does, a web App unless the test names another.
const appOn = (platform: PluginSurface['platform'] = 'web'): Asking => ({
  surface: currentPluginSurface(platform),
});

// One Server's Loader pages for the test's life, so a draw can answer against a tree it sent before.
export function testPages(
  { service, runtime }: Hosted,
  pluginId: string,
): PluginTest['pages'] {
  const operations = new PluginOperationService(service, runtime.operations);
  const pages = new LoaderPages(service, runtime.draws, operations);

  const server = {
    draw: (request: Omit<DrawRequest, 'pluginId'>, platform?: Platform) =>
      pages.draw({ pluginId, ...request }, appOn(platform)),
    run: (run: Omit<PageRun, 'pluginId'>) => pages.run({ pluginId, ...run }),
  };

  return {
    draw: ({ platform, ...input }) =>
      server.draw({ pageState: {}, pages: 1, ...input }, platform),
    open: (opening) => PageView.open(server, opening),
    run: (input) => server.run(input),
    stale: (signal) => pages.stale(signal),
  };
}

const runInput = (input: RunInput, fallbackId: string): Run => ({
  ...givenToRun(input),
  pluginId: input.pluginId ?? fallbackId,
  name: input.name,
});

// A run with no params and no caller is the user's own, against the Plugin under test.
const givenToRun = ({
  params,
  caller,
}: RunInput): Pick<Run, 'params' | 'caller'> => ({
  params: params ?? {},
  caller: caller ?? {},
});
