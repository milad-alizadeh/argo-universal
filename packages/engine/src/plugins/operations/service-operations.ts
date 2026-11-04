import type { OperationRow } from '@repo/contracts/operations';
import type { PluginList } from '@repo/contracts/plugins';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import type { PluginOperationCaller } from '@repo/contracts/plugins/plugin-operations';
import type { OperationCard } from '../../sessions';
import { checkRun, type CheckedRun } from './checked-run';
import {
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
      serverDevice?: boolean;
    },
  ) => Promise<Answer>;
};

/*
 * One run of a Plugin's own Operation. `serverDevice` says the Connection that asked is the Server Device,
 * as a tap in the App there is; an Agent's `argo run` and a Hook's run leave it out.
 */
export type OperationRun = {
  pluginId: string;
  name: string;
  params: Json;
  caller: PluginOperationCaller;
  serverDevice?: boolean;
  // Asks the user first, for a Session's run in a Project other than its own; a run with none is refused there.
  confirm?: (card: OperationCard) => Promise<void>;
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
  const checked = await checkedRun(declared, input);

  await port.requireRunning(input.pluginId);

  const answer = await port.call(input.pluginId, {
    name: input.name,
    ...checked,
    ...(input.serverDevice && { serverDevice: true }),
  });

  if (!answer.ok) throw new Error(answer.error);

  return answer.result;
}

// The params and caller the handler is given; a run in another Project is confirmed first.
async function checkedRun(
  { operation }: DeclaredOperation,
  input: OperationRun,
): Promise<Omit<CheckedRun, 'outside'>> {
  const { outside, ...checked } = checkRun(
    operation,
    input.params,
    input.caller,
  );

  if (outside) await confirmed(input, operation.label);

  return checked;
}

// Another Project is `confirm` tier whatever the Operation's own tier (ADR-0044), so the user is asked first.
async function confirmed(
  { confirm, name }: OperationRun,
  label: string,
): Promise<void> {
  if (!confirm)
    throw new Error(`${name} in another Project needs the user to confirm`);

  await confirm({
    title: label,
    description:
      'Run a Plugin Operation in a Project other than the calling Session’s.',
  });
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
