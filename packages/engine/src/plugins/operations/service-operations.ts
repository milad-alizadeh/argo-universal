import type { OperationRow } from '@repo/contracts/operations';
import type { PluginList } from '@repo/contracts/plugins';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import type { PluginOperationCaller } from '@repo/contracts/plugins/plugin-operations';
import {
  checkParams,
  declaredOperations,
  operationRow,
  type DeclaredOperation,
} from './declared-operations';
import type { Answer } from './plugin-operations';

/*
 * What running a Plugin's own Operation needs of the Plugin service: the declared Plugins, a worker
 * that is running, and the call itself (ADR-0044).
 */
export type OperationsPort = {
  list: () => Promise<PluginList>;
  requireRunning: (pluginId: string) => Promise<void>;
  call: (
    pluginId: string,
    request: {
      name: string;
      params: Readonly<Record<string, string | number | boolean>>;
      caller: PluginOperationCaller;
    },
  ) => Promise<Answer>;
};

export type OperationRun = {
  pluginId: string;
  name: string;
  params: Json;
  caller: PluginOperationCaller;
};

// Every enabled Plugin's declared Operations, as the registry lists them.
export const declaredOperationRows = async (
  port: OperationsPort,
): Promise<OperationRow[]> =>
  declaredOperations(await port.list()).map(operationRow);

/*
 * One of a Plugin's own Operations: the params are checked against what it declared, its worker is
 * started if it is not running, and the handler's result is what the caller is answered.
 */
export async function runDeclaredOperation(
  port: OperationsPort,
  input: OperationRun,
): Promise<Json> {
  const declared = await declaredOperation(port, input);
  const params = checkParams(declared.operation.params ?? {}, input.params);

  await port.requireRunning(input.pluginId);

  const answer = await port.call(input.pluginId, { ...input, params });

  if (!answer.ok) throw new Error(answer.error);

  return answer.result;
}

async function declaredOperation(
  port: OperationsPort,
  { pluginId, name }: { pluginId: string; name: string },
): Promise<DeclaredOperation> {
  const found = declaredOperations(await port.list()).find(
    (declared) =>
      declared.pluginId === pluginId && declared.operation.name === name,
  );

  if (!found) throw new Error(`Unknown Operation ${pluginId}.${name}`);

  if (!found.enabled) throw new Error(`${found.pluginName} is turned off`);

  return found;
}
