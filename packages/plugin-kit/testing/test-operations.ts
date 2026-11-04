import { currentPluginSurface } from '@repo/contracts/plugins/kit';
import {
  type Asking,
  LoaderPages,
  PluginOperationService,
  type PluginRuntime,
  type PluginService,
} from '@repo/engine/plugins';
import type { PluginTest } from './test-types';

type Operations = PluginTest['operations'];

type Hosted = { service: PluginService; runtime: PluginRuntime };

type RunInput = Parameters<Operations['run']>[0];

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

// A draw asks as a web App does, as a mounted view's Connection does by default.
const webApp: Asking = { surface: currentPluginSurface('web') };

// One Server's Loader pages for the test's life, so a draw can answer against a tree it sent before.
export function testPages(
  { service, runtime }: Hosted,
  pluginId: string,
): PluginTest['pages'] {
  const operations = new PluginOperationService(service, runtime.operations);
  const pages = new LoaderPages(service, runtime.draws, operations);

  return {
    draw: (input) =>
      pages.draw({ pluginId, pageState: {}, pages: 1, ...input }, webApp),
    run: (input) => pages.run({ pluginId, ...input }),
    stale: (signal) => pages.stale(signal),
    live: (input, signal) =>
      pages.live({ pluginId, pageState: {}, ...input }, { ...webApp, signal }),
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
