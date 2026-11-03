import type { OperationRow } from '@repo/contracts/operations';
import type { PluginList } from '@repo/contracts/plugins';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import type { PluginStatus } from '@repo/contracts/plugins/runtime';
import type { Answer, PluginOperations } from './plugin-operations';
import {
  declaredOperationRows,
  runDeclaredOperation,
  type OperationRun,
  type OperationsPort,
} from './service-operations';

// What the port needs of the Plugin service and its runtime, so neither has to know about the other.
export type OperationHost = {
  list: () => Promise<PluginList>;
  activate: (pluginId: string) => Promise<PluginStatus>;
};

/*
 * The Operations running Plugins add to the registry. It sits beside the Plugin service rather than
 * inside it: a Plugin Operation is an Agent's step, not part of drawing or starting a Plugin.
 */
export class PluginOperationService {
  private readonly port: OperationsPort;

  public constructor(host: OperationHost, operations: PluginOperations) {
    this.port = {
      list: (): Promise<PluginList> => host.list(),
      requireRunning: (pluginId): Promise<void> =>
        requireRunning(host, pluginId),
      call: (pluginId, request): Promise<Answer> =>
        operations.run(pluginId, request),
    };
  }

  public rows(): Promise<OperationRow[]> {
    return declaredOperationRows(this.port);
  }

  public run(input: OperationRun): Promise<Json> {
    return runDeclaredOperation(this.port, input);
  }
}

// A Plugin's worker starts on the first Operation run against it, as it does for a page or a Hook.
async function requireRunning(
  host: OperationHost,
  pluginId: string,
): Promise<void> {
  const status = await host.activate(pluginId);

  if (status.state !== 'running')
    throw new Error(status.error ?? `Plugin ${pluginId} is not running`);
}
