import {
  PluginOperationService,
  type PluginRuntime,
  type PluginService,
} from '@repo/engine/plugins';
import type { PluginTest } from './test-types';

type Operations = PluginTest['operations'];

type RunInput = Parameters<Operations['run']>[0];

type Run = Parameters<PluginOperationService['run']>[0];

/*
 * One run of one of the Plugin's own Operations, as an Agent's `argo run` would (ADR-0044). The test
 * names the Operation; its Plugin, params and caller default to the Plugin under test and no Session.
 */
export function testOperations(
  { service, runtime }: { service: PluginService; runtime: PluginRuntime },
  pluginId: string,
): Operations {
  const operations = new PluginOperationService(service, runtime.operations);

  return {
    list: () => operations.rows(),
    run: (input) => operations.run(runInput(input, pluginId)),
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
